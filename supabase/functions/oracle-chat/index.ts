// supabase/functions/oracle-chat/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from '../_shared/cors.ts';

// --- Read Environment Variables ---
const WEAVIATE_URL = Deno.env.get('WEAVIATE_URL');
const WEAVIATE_API_KEY = Deno.env.get('WEAVIATE_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

// --- Type Definitions for this Function ---
// ... (These remain the same)
interface FileType {
  file_id: string;
  name: string;
  type: string;
  url: string | null;
  page_previews: string[] | null;
}

interface ActiveSource {
  number: number;
  file: FileType;
  pageNumber: number | null;
  content: string;
  file_id?: string;
}
interface LlmContextPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

// --- Main Server Logic ---
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user and initialize clients
    // ... (This section remains the same)
    const adminSupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const weaviateClient = weaviate.client({
      scheme: 'https',
      host: WEAVIATE_URL!,
      apiKey: new ApiKey(WEAVIATE_API_KEY!),
      headers: { 'X-OpenAI-Api-Key': OPENAI_API_KEY! }, // Optional if you're not using text2vec-openai
    });
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    const { data: { user } } = await userSupabaseClient.auth.getUser();    if (!user) throw new Error('Authentication error.');

    const { message, class_id } = await req.json();
    if (!message) throw new Error("Missing 'message' in request body.");

    // --- NEW: Step 2 - Manually create embedding for the user's query ---
    console.log(`[EMBEDDING] Creating embedding for query: "${message}"`);
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY!}` },
      body: JSON.stringify({
        input: message,
        model: "text-embedding-3-small",
      }),
    });
    if (!embeddingResponse.ok) throw new Error("Failed to create embedding for the user query.");
    const embeddingData = await embeddingResponse.json();
    const queryVector = embeddingData.data[0].embedding;
    console.log(`[EMBEDDING] ✅ Embedding created successfully.`);

    // --- UPDATED: Step 3 - Use nearVector to perform semantic search ---
    console.log(`[WEAVIATE] Performing nearVector search...`);
    const weaviateResponse = await weaviateClient.graphql
      .get()
      .withClassName('DocumentChunk')
      .withNearVector({ vector: queryVector }) // Use the vector directly
      .withLimit(5)
      .withWhere({
          operator: 'And',
          operands: [
              { path: ['user_id'], operator: 'Equal', valueText: user.id },
              ...(class_id ? [{ path: ['class_id'], operator: 'Equal', valueText: class_id }] : []),
          ],
      })
      .withFields('source_file_id page_number text_chunk')
      .do();
    console.log('[DEBUG] Raw Weaviate response:', JSON.stringify(weaviateResponse, null, 2));
    console.log(`[WEAVIATE] ✅ Search complete.`);
      
    // ... (The rest of the function for Context Assembly, Synthesis, and Response remains exactly the same)
    const retrievedChunks = weaviateResponse.data.Get.DocumentChunk;
    console.log(`[DEBUG] Retrieved ${retrievedChunks.length} chunks from Weaviate.`);
retrievedChunks.forEach((chunk, idx) => {
  console.log(`[CHUNK ${idx + 1}]`, JSON.stringify(chunk, null, 2));
});
    const contextForLLM: LlmContextPart[] = [];
    const sourcesForFrontend: ActiveSource[] = [];

    let sourceCounter = 1;

    if (retrievedChunks && retrievedChunks.length > 0) {
      for (const chunk of retrievedChunks) {
        const { source_file_id, page_number, text_chunk } = chunk;

        const { data: fileData, error } = await adminSupabaseClient
          .from('files')
          .select('file_id, name, type, url, page_previews')
          .eq('file_id', source_file_id)
          .single();
        
        if (error || !fileData) {
          console.warn(`Could not retrieve file data for file_id: ${source_file_id}`);
          continue;
        }

        const pagePreviewUrl = Array.isArray(fileData.page_previews) && fileData.page_previews[page_number - 1] 
          ? fileData.page_previews[page_number - 1] 
          : null;

        contextForLLM.push({
          type: "text",
          text: `Source [${sourceCounter}]: From page ${page_number} of "${fileData.name}", the user has the following text chunk: "${text_chunk}"`
        });

        if (pagePreviewUrl) {
            contextForLLM.push({
              type: "image_url",
              image_url: { url: pagePreviewUrl }
            });
        }

        sourcesForFrontend.push({
          number: sourceCounter,
          file: fileData as FileType,
          pageNumber: page_number,
          content: text_chunk,
          file_id: source_file_id, // Add this line
        });

        sourceCounter++;
      }
    }
    
    // 5. Synthesize the final answer using the assembled context
    const systemPrompt = `You are an expert academic assistant. Answer the user's question based *only* on the provided sources. Cite your sources in your answer using the format [SOURCE 1], [SOURCE 2], etc. If the provided sources are not sufficient to answer the question, say so. Be concise and helpful.`;
    console.log('[DEBUG] Assembling full prompt...');

    const userPromptContent: LlmContextPart[] = [{type: "text", text: `User Question: "${message}"`}];
    if (contextForLLM.length > 0) {
        userPromptContent.push({type: "text", text: `\n\nSources:\n`});
        userPromptContent.push(...contextForLLM);
    }
    console.log('[DEBUG] Constructed contextForLLM:', JSON.stringify(contextForLLM, null, 2));
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY!}` },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPromptContent }
            ],
            max_tokens: 1000,
        }),
    });

    if (!openAIResponse.ok) {
        const errorBody = await openAIResponse.text();
        throw new Error(`Failed to get response from OpenAI: ${errorBody}`);
    }
    const completion = await openAIResponse.json();
    const aiResponseContent = completion.choices[0].message.content;

    // 6. Return the structured response
    return new Response(JSON.stringify({
      response: aiResponseContent,
      sources: sourcesForFrontend,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[CRITICAL-ERROR] in oracle-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});