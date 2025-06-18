// supabase/functions/chat/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from "../_shared/cors.ts";
import pdf from 'npm:pdf-parse@1.1.1';

// --- TYPE DEFINITIONS ---
interface AttachedFilePayload {
    name: string;
    type: string;
    content: string; // base64 encoded
}

interface RequestBody {
    message: string;
    history?: { role: 'user' | 'assistant'; content: string; }[];
    class_id?: string; // This MUST be present and correctly typed
    files?: AttachedFilePayload[];
}

interface OpenAIChatCompletion {
    choices: { message: { content: string; }; }[];
}

interface Source {
    number: number;
    name: string;
    url: string;
    content: string;
    highlight?: string;
}

type FileRow = {
    file_id: string;
    name: string;
    url: string | null;
}

// --- HELPER FUNCTIONS ---
async function findVerbatimQuote(openaiApiKey: string, sourceContent: string, summarySentence: string): Promise<string> {
    try {
        const prompt = `From the [SOURCE DOCUMENT SNIPPET], find the exact verbatim phrase that best matches the [SUMMARY SENTENCE]. Return only that phrase.\n\n[SOURCE DOCUMENT SNIPPET]:\n${sourceContent}\n\n[SUMMARY SENTENCE]:\n${summarySentence}\n\n[VERBATIM QUOTE FROM SOURCE]:`;
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: 'POST', headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: prompt }], temperature: 0, max_tokens: 150 }),
        });
        if (!response.ok) return summarySentence;
        const data: OpenAIChatCompletion = await response.json();
        return data.choices[0]?.message?.content.trim() || summarySentence;
    } catch (e) {
        console.error("Error in findVerbatimQuote:", e);
        return summarySentence;
    }
}

async function extractTextFromPdf(base64Content: string): Promise<string> {
    try {
        const buffer = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
        const data = await pdf(buffer);
        return data.text;
    } catch (error) {
        console.error("Failed to parse PDF content:", error);
        return "";
    }
}

// --- MAIN SERVER LOGIC ---
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log("--- [CHAT START] Function invoked ---");
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
        const weaviateHost = Deno.env.get("WEAVIATE_URL");
        const weaviateApiKey = Deno.env.get("WEAVIATE_API_KEY");

        if (!supabaseUrl || !supabaseServiceRoleKey || !weaviateHost || !weaviateApiKey || !openAIApiKey) {
            throw new Error('Server configuration error: Required secrets are missing.');
        }

        const supabaseAdminClient: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
        const { data: { user } } = await createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } } }).auth.getUser();
        if (!user) throw new Error("User not authenticated.");
        console.log(`--- [CHAT LOG] Authenticated user: ${user.id} ---`);
        
        // Destructure class_id from the request body
        const { message, history = [], files = [], class_id }: RequestBody = await req.json(); 
        console.log(`--- [CHAT LOG] Raw class_id received: "${class_id}" ---`); 
        console.log(`--- [CHAT LOG] Received message: "${message}", class_id: "${class_id}" ---`); // Log class_id here to confirm value

        const imageParts: { type: "image_url", image_url: { url: string } }[] = [];
        let uploadedFileContext = "";
        const ragSearchQuery = message; 
        let finalUserQuestion = message;
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                imageParts.push({ type: "image_url", image_url: { url: `data:${file.type};base64,${file.content}` } });
            } else if (file.type === 'application/pdf') {
                const pdfText = await extractTextFromPdf(file.content);
                if (pdfText) { uploadedFileContext += `\n\n--- Content from uploaded PDF: ${file.name} ---\n${pdfText}`; }
            }
        }
        
        if (imageParts.length > 0) {
            console.log("Image detected. Performing analysis to add context.");
            const analysisPrompt = `The user has uploaded an image and provided the following instruction: "${message}". Describe the image concisely. This description will be added as context for the main query.`;
            const analysisResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{ role: 'user', content: [{ type: 'text', text: analysisPrompt }, ...imageParts] }],
                    max_tokens: 150,
                }),
            });
            if (!analysisResponse.ok) console.error("Image analysis call failed");
            else {
                const analysisData: OpenAIChatCompletion = await analysisResponse.json();
                const extractedText = analysisData.choices[0]?.message?.content.trim();
                if (extractedText) {
                    console.log("Adding extracted text from image as additional context:", extractedText);
                    finalUserQuestion = `User's question is: "${message}". \n\nContext from attached image: ${extractedText}`;
                }
            }
        }
        
        console.log("--- [CHAT LOG] Preparing to query Weaviate. ---");
        const weaviateClient: WeaviateClient = weaviate.client({
            scheme: 'https', host: weaviateHost, apiKey: new ApiKey(weaviateApiKey),
        });
        console.log(`--- [CHAT LOG] Creating embedding for query: "${ragSearchQuery}" ---`);
        const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: ragSearchQuery, model: 'text-embedding-3-small' }),
        });
        if (!embeddingResponse.ok) throw new Error("Failed to create embedding for search query.");
        const embeddingData = await embeddingResponse.json();
        const queryVector = embeddingData.data[0].embedding;
        console.log("--- [CHAT LOG] Embedding created successfully. ---");
        
        // Build the whereFilter dynamically based on class_id
        const operands = [{ path: ['user_id'], operator: 'Equal', valueText: user.id }];
        
        // This is the critical block that needs to ensure class_id is added
        // if it's present and not "all" (the value from the dropdown for all documents).
        if (class_id && class_id !== "all") { 
            operands.push({ path: ['class_id'], operator: 'Equal', valueText: class_id });
            console.log(`--- [CHAT LOG] Added class_id to filter: ${class_id} ---`); // ADD THIS
        }

        const whereFilter = {
            operator: 'And',
            operands: operands
        };
        console.log("--- [CHAT LOG] Weaviate whereFilter:", JSON.stringify(whereFilter, null, 2)); // Log the final filter

        let ragContextText = ""; 
        const allRetrievedSources: Source[] = [];
        let sourceCounter = 1;

        if (ragSearchQuery) { 
            try {
                console.log("--- [DIAGNOSTIC] Running a simple WHERE filter query without vector search... ---");
                const diagnosticResponse = await weaviateClient.graphql.get()
                  .withClassName('DocumentChunk')
                  .withFields('text_chunk source_file_id class_id user_id') // Get more fields for debugging
                  .withWhere(whereFilter)
                  .withLimit(10)
                  .do();
                console.log("--- [DIAGNOSTIC] Response:", JSON.stringify(diagnosticResponse, null, 2));
            
                // For this test, we can just return the diagnostic data directly
                return new Response(JSON.stringify(diagnosticResponse.data.Get.DocumentChunk), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                });       
            } catch (weaviateError) {
                 console.error("--- [CHAT ERROR] Error querying Weaviate:", weaviateError);
                ragContextText = ""; 
            }
        }
        
        const systemPrompt = `You are an expert AI Tutor.
Your instructions are strict.
1.  Base your answers on the context I provide from documents.
2.  If the context does not contain any relevant information, you MUST state that and then you can use your general knowledge to answer.
3.  You MUST cite sources when you use information from the context. Use the format (SOURCE N) immediately after the piece of information.
4.  NEVER combine citations. Each fact gets its own citation. Example: "Fact A (SOURCE 1). Fact B (SOURCE 2)." is correct. "Fact A and B (SOURCE 1, 2)." is wrong.
5.  When creating a numbered list, ALWAYS use sequential numbering (1., 2., 3.), not "1., 1., 1.".`;
        const finalContext = `${ragContextText ? `CONTEXT FROM YOUR DOCUMENTS:\n${ragContextText}` : ''}${uploadedFileContext ? `\n\nCONTEXT FROM UPLOADED FILES:\n${uploadedFileContext}` : ''}`.trim();
        console.log(`--- [CHAT LOG] Final context length: ${finalContext.length} characters. ---`);
        const mainPromptText = `${finalContext ? `${finalContext}\n\n---\n\n` : ''}Based on all context provided, and considering any attached images, please answer the following question:\n\n${finalUserQuestion}`;
        const userContent = [{ type: "text", text: mainPromptText }, ...imageParts];
        const openAIPayload = {
            model: "gpt-4o",
            messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: userContent as any }],
            temperature: 0.3,
        };
        console.log("--- [CHAT LOG] Sending final payload to OpenAI. ---");
        const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(openAIPayload),
        });
        if (!openAIResponse.ok) throw new Error(`OpenAI API request failed: ${await openAIResponse.text()}`);
        const jsonResponse: OpenAIChatCompletion = await openAIResponse.json();
        const assistantResponse = jsonResponse.choices[0]?.message?.content;
        if (!assistantResponse) throw new Error("No response content from OpenAI.");
        console.log("--- [CHAT LOG] Received response from OpenAI. ---");
        const citationRegex = /\(SOURCE (\d+)\)/g;
        const citedSourceNumbers = [...new Set([...assistantResponse.matchAll(citationRegex)].map(match => parseInt(match[1], 10)))].sort((a,b) => a-b);
        let remappedContent = assistantResponse;
        const highlightPromises: Promise<void>[] = [];

        const finalSources = citedSourceNumbers.map((originalNumber, index) => {
            const newNumber = index + 1;
            const sourceData = allRetrievedSources.find(s => s.number === originalNumber);
            remappedContent = remappedContent.replace(new RegExp(`\\(SOURCE ${originalNumber}\\)`, 'g'), `(SOURCE ${newNumber})`);
            if (sourceData) {
                const summarySentence = assistantResponse.split(/(?<=[.!?])\s+/).find(s => s.includes(`(SOURCE ${originalNumber})`));
                if (summarySentence) {
                    const promise = findVerbatimQuote(openAIApiKey, sourceData.content, summarySentence).then(q => { sourceData.highlight = q; });
                    highlightPromises.push(promise);
                }
            }
            return { ...(sourceData || { name: 'Unknown', url: '#', content: 'Source not found.' }), number: newNumber };
        });
        await Promise.all(highlightPromises);
        console.log("--- [CHAT END] Function finished successfully. ---");

        return new Response(JSON.stringify({ response: remappedContent.trim(), sources: finalSources }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
        });
    } catch (error) {
        console.error("--- [CHAT FATAL] Critical error in chat function:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});