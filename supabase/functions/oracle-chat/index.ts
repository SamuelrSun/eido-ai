// supabase/functions/oracle-chat/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
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
}

interface ActiveSource {
  number: number;
  file: FileType;
  pageNumber: number | null;
  content: string;
  file_id?: string;
}

interface ProcessedResult {
  question: string;
  answer: string;
  sources: ActiveSource[];
}

async function processSingleQuery(
  query: string, 
  weaviateClient: WeaviateClient, 
  adminSupabaseClient: SupabaseClient, 
  user_id: string, 
  class_id: string | null
): Promise<ProcessedResult> {
  
  console.log(`[RAG-STEP] Processing query: "${query}"`);

  const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY!}` },
    body: JSON.stringify({ input: query, model: "text-embedding-3-small" }),
  });
  if (!embeddingResponse.ok) throw new Error(`Failed to create embedding for query: "${query}"`);
  const embeddingData = await embeddingResponse.json();
  const queryVector = embeddingData.data[0].embedding;

  const weaviateResponse = await weaviateClient.graphql
    .get()
    .withClassName('DocumentChunk')
    .withNearVector({ vector: queryVector })
    .withLimit(10)
    .withWhere({
        operator: 'And',
        operands: [
            { path: ['user_id'], operator: 'Equal', valueText: user_id },
            ...(class_id ? [{ path: ['class_id'], operator: 'Equal', valueText: class_id }] : []),
        ],
    })
    .withFields('source_file_id page_number text_chunk source_file_name')
    .do();
  
  const retrievedChunks = weaviateResponse.data.Get.DocumentChunk || [];
  
  console.log(`\n--- BEGIN RETRIEVAL VERIFICATION (Query: "${query}") ---\nTotal Chunks Retrieved: ${retrievedChunks.length}\n`);
  console.log(JSON.stringify(retrievedChunks, null, 2));
  console.log(`\n--- END RETRIEVAL VERIFICATION ---\n`);


  if (retrievedChunks.length === 0) {
    return { question: query, answer: "I could not find any information on this topic in the provided documents.", sources: [] };
  }
  
  const uniqueFileIds = [...new Set(retrievedChunks.map((chunk: any) => chunk.source_file_id))];
  const { data: filesData } = await adminSupabaseClient.from('files').select('file_id, name, type, url').in('file_id', uniqueFileIds);
  const fileMap = new Map(filesData?.map(file => [file.file_id, file]) || []);
  
  const sourcesForLLM: ActiveSource[] = [];
  const contextForLLM = retrievedChunks.map((chunk: any, index: number) => {
    const fileInfo = fileMap.get(chunk.source_file_id);
    if (fileInfo) {
      sourcesForLLM.push({
        number: index + 1,
        file: fileInfo as FileType,
        pageNumber: chunk.page_number,
        content: chunk.text_chunk,
        file_id: chunk.source_file_id,
      });
      return `Source [${index + 1}]: From page ${chunk.page_number} of "${chunk.source_file_name}":\n"${chunk.text_chunk}"`;
    }
    return "";
  }).filter(Boolean).join('\n\n---\n\n');

  const systemPrompt = `You are an academic assistant. Your primary goal is to answer the user's question using ONLY the information from the provided sources.
- Synthesize a detailed answer based on the text in the sources.
- You MUST cite every piece of information you use with the corresponding source number, like [Source X].
- If the sources only partially answer the question, provide the information you can find and then you can mention what information is missing.
- Be resourceful. Connect concepts from the sources to the user's question where possible. Only if the sources contain absolutely no relevant information should you state that you cannot answer.
- Do not make up information. Your entire answer must be derived from the provided sources.`;
  
  const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY!}` },
      body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `User Question: "${query}"\n\nSources:\n${contextForLLM}` }
          ],
          temperature: 0.2,
      }),
  });
  if (!openAIResponse.ok) throw new Error(`OpenAI API error: ${await openAIResponse.text()}`);
  
  const completion = await openAIResponse.json();
  const answer = completion.choices[0].message.content;

  console.log(`[RAG-STEP] Synthesized answer for query.`);
  return { question: query, answer, sources: sourcesForLLM };
}


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const adminSupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const weaviateClient = weaviate.client({
      scheme: 'https', host: WEAVIATE_URL!, apiKey: new ApiKey(WEAVIATE_API_KEY!),
      headers: { 'X-OpenAI-Api-Key': OPENAI_API_KEY! },
    });
    const { data: { user } } = await createClient(
      Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    ).auth.getUser();
    if (!user) throw new Error('Authentication error.');

    const { message, class_id } = await req.json();
    if (!message) throw new Error("Missing 'message' in request body.");

    const instructionalPhrases = ["answer the following questions:", "answer these questions:"];
    const questions = message
        .trim()
        .split('\n')
        .map((q: string) => q.trim().replace(/^[•\\*\\-]\s*/, ''))
        .filter((q: string) => q.length > 5 && !instructionalPhrases.includes(q.toLowerCase()));

    if (questions.length === 0) {
        questions.push(message.trim());
    }

    console.log(`[MAIN] Detected ${questions.length} distinct question(s). Processing in parallel...`);
    
    const processingPromises = questions.map((q: string) => processSingleQuery(q, weaviateClient, adminSupabaseClient, user.id, class_id));
    const results = await Promise.all(processingPromises);

    let finalResponseText = "";
    const finalSources: ActiveSource[] = [];
    const sourceMap = new Map<string, number>();
    let nextSourceNumber = 1;

    for (const result of results) {
        // --- FIX START: This logic now correctly renumbers citations without the cascading replacement bug ---
        const localCitations = [...result.answer.matchAll(/\[Source (\d+)]/g)];
        const oldToNewSourceNumberMap = new Map<number, number>();

        // Step 1: Discover all unique sources cited in this specific answer and build the renumbering map.
        for (const match of localCitations) {
            const localNumber = parseInt(match[1]);
            if (oldToNewSourceNumberMap.has(localNumber)) continue; 

            const originalSource = result.sources.find(s => s.number === localNumber);
            if (originalSource) {
                const sourceKey = `${originalSource.file_id}-${originalSource.pageNumber}-${originalSource.content.slice(0, 50)}`;
                let finalNumber;
                if (sourceMap.has(sourceKey)) {
                    finalNumber = sourceMap.get(sourceKey)!;
                } else {
                    finalNumber = nextSourceNumber++;
                    sourceMap.set(sourceKey, finalNumber);
                    finalSources.push({ ...originalSource, number: finalNumber });
                }
                oldToNewSourceNumberMap.set(localNumber, finalNumber);
            }
        }

        // Step 2: Replace all citations in a single pass using the completed map and a replacer function.
        // This avoids the cascading replacement problem.
        const renumberedAnswer = result.answer.replace(/\[Source (\d+)]/g, (match, oldNumberStr) => {
            const oldNum = parseInt(oldNumberStr, 10);
            const newNum = oldToNewSourceNumberMap.get(oldNum);
            return newNum !== undefined ? `[Source ${newNum}]` : match;
        });
        // --- FIX END ---
        
        finalResponseText += `${renumberedAnswer}\n\n`;
    }

    console.log(`[MAIN] ✅ Finished processing all questions.`);
    return new Response(JSON.stringify({
      response: finalResponseText.trim(),
      sources: finalSources.sort((a, b) => a.number - b.number),
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