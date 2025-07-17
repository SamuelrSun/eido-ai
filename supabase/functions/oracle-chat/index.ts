// supabase/functions/oracle-chat/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from '../_shared/cors.ts';

const WEAVIATE_URL = Deno.env.get('WEAVIATE_URL');
const WEAVIATE_API_KEY = Deno.env.get('WEAVIATE_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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
  type: 'text';
  text: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const adminSupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const weaviateClient = weaviate.client({
      scheme: 'https',
      host: WEAVIATE_URL!,
      apiKey: new ApiKey(WEAVIATE_API_KEY!),
      headers: { 'X-OpenAI-Api-Key': OPENAI_API_KEY! },
    });
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    const { data: { user } } = await userSupabaseClient.auth.getUser();
    if (!user) throw new Error('Authentication error.');

    const { message, class_id } = await req.json();
    if (!message) throw new Error("Missing 'message' in request body.");

    // MODIFICATION: Re-introducing the manual embedding step for the query.
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
    
    // MODIFICATION: Pass BOTH the text 'query' for keyword search AND the manual 'vector' for semantic search.
    // This resolves the "no vectorizer" error.
    console.log(`[WEAVIATE] Performing hybrid search...`);
    const weaviateResponse = await weaviateClient.graphql
      .get()
      .withClassName('DocumentChunk')
      .withHybrid({
          query: message,
          vector: queryVector,
          alpha: 0.5,
      })
      .withLimit(5)
      .withWhere({
          operator: 'And',
          operands: [
              { path: ['user_id'], operator: 'Equal', valueText: user.id },
              ...(class_id ? [{ path: ['class_id'], operator: 'Equal', valueText: class_id }] : []),
          ],
      })
      .withFields('source_file_id page_number text_chunk source_file_name')
      .do();
    
    const retrievedChunks = weaviateResponse.data.Get.DocumentChunk || [];
    console.log(`[WEAVIATE] ✅ Hybrid search complete. Found ${retrievedChunks.length} chunks.`);

    // --- The rest of the function remains unchanged ---

    const sourcesForFrontend: ActiveSource[] = [];
    const uniqueFileIds = [...new Set(retrievedChunks.map((chunk: any) => chunk.source_file_id))];

    const { data: filesData, error: filesError } = await adminSupabaseClient
      .from('files')
      .select('file_id, name, type, url, page_previews')
      .in('file_id', uniqueFileIds);

    if (filesError) {
      console.warn(`Could not retrieve file metadata: ${filesError.message}`);
    }

    const fileMap = new Map(filesData?.map(file => [file.file_id, file]) || []);
    let contextForLLM = "";
    
    if (retrievedChunks.length > 0) {
      contextForLLM = retrievedChunks.map((chunk: any, index: number) => {
        const fileInfo = fileMap.get(chunk.source_file_id);
        if (fileInfo) {
          sourcesForFrontend.push({
            number: index + 1,
            file: fileInfo as FileType,
            pageNumber: chunk.page_number,
            content: chunk.text_chunk,
            file_id: chunk.source_file_id,
          });
          return `Source [${index + 1}]: From page ${chunk.page_number} of "${chunk.source_file_name}", the user has the following text chunk: "${chunk.text_chunk}"`;
        }
        return "";
      }).filter(Boolean).join('\n\n');
    }
    
    const systemPrompt = `You are a helpful academic assistant. Your task is to answer the user's question based *only* on the provided sources.
- Synthesize the information from the sources into a clear and concise answer.
- You MUST cite your sources in your answer using the format [SOURCE X] immediately after the information it supports.
- You may cite the same source multiple times if you use information from it more than once.
- If the provided sources are not sufficient to answer the question, you must state that you cannot answer the question with the given information. Do not use outside knowledge.`;

    const userPromptContent: LlmContextPart[] = [
        { type: "text", text: `User Question: "${message}"` }
    ];

    if (contextForLLM) {
        userPromptContent.push({ type: "text", text: `\n\nSources:\n${contextForLLM}` });
    }

    console.log('[LLM] Sending request to OpenAI for synthesis...');
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY!}` },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPromptContent.map(c => c.text).join('\n') }
            ],
            max_tokens: 1000,
            temperature: 0.1,
        }),
    });
    if (!openAIResponse.ok) {
        const errorBody = await openAIResponse.text();
        throw new Error(`Failed to get response from OpenAI: ${errorBody}`);
    }
    const completion = await openAIResponse.json();
    const aiResponseContent = completion.choices[0].message.content;
    console.log('[LLM] ✅ Response received.');

    const citationRegex = /\[SOURCE (\d+)]/g;
    const citedSourceNumbers = new Set(
        Array.from(aiResponseContent.matchAll(citationRegex), match => parseInt(match[1], 10))
    );

    if (citedSourceNumbers.size === 0 && sourcesForFrontend.length > 0) {
      console.log("[FINALIZE] AI did not cite any sources. Returning response without source data.");
      return new Response(JSON.stringify({
        response: aiResponseContent,
        sources: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const finalCitedSources = sourcesForFrontend
      .filter(source => citedSourceNumbers.has(source.number))
      .map((source, index) => ({ ...source, newNumber: index + 1 }));

    const numberMap = new Map(finalCitedSources.map(source => [source.number, source.newNumber]));
    
    const renumberedContent = aiResponseContent.replace(citationRegex, (match: string, oldNumStr: string) => {
        const oldNum = parseInt(oldNumStr, 10);
        const newNum = numberMap.get(oldNum);
        return newNum ? `[SOURCE ${newNum}]` : match;
    });

    const finalSourcesForResponse = finalCitedSources.map(({ newNumber, ...rest}) => ({...rest, number: newNumber}));
    console.log(`[FINALIZE] ✅ Final response and ${finalSourcesForResponse.length} cited sources prepared.`);
    
    return new Response(JSON.stringify({
      response: renumberedContent,
      sources: finalSourcesForResponse,
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