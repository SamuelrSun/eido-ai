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
    .withHybrid({ query: query, vector: queryVector, alpha: 0.5 })
    .withLimit(5)
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
  console.log(`[RAG-STEP] Retrieved ${retrievedChunks.length} chunks for query: "${query}".`);

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
      return `Source [${index + 1}]: From page ${chunk.page_number} of "${chunk.source_file_name}": "${chunk.text_chunk}"`;
    }
    return "";
  }).filter(Boolean).join('\n\n');

  const systemPrompt = `You are an academic assistant. Answer the user's question based *only* on the provided sources. Cite sources using the format [Source X]. If the sources are not sufficient, say so.`;
  
  const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY!}` },
      body: JSON.stringify({
          model: "gpt-4o",
          messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `User Question: "${query}"\n\nSources:\n${contextForLLM}` }
          ],
          max_tokens: 400,
          temperature: 0.1,
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

    // MODIFICATION: Replaced the complex regex with a simpler, more robust method
    // that correctly handles bullet points and dashes.
    const instructionalPhrases = ["answer the following questions:", "answer these questions:"];
    const questions = message
        .trim()
        .split('\n') // 1. Split into lines
        .map((q: string) => q.trim().replace(/^[•\\*\\-]\s*/, '')) // 2. Trim and remove leading bullets/dashes
        .filter((q: string) => q.length > 5 && !instructionalPhrases.includes(q.toLowerCase())); // 3. Filter out empty or instructional lines

    console.log(`[MAIN] Detected ${questions.length} distinct question(s). Processing in parallel...`);
    
    const processingPromises = questions.map((q: string) => processSingleQuery(q, weaviateClient, adminSupabaseClient, user.id, class_id));
    const results = await Promise.all(processingPromises);

    let finalResponseText = "";
    const finalSources: ActiveSource[] = [];
    const sourceMap = new Map<string, number>();
    let nextSourceNumber = 1;

    for (const result of results) {
        let renumberedAnswer = result.answer;

        const localCitations = [...result.answer.matchAll(/\[Source (\d+)]/g)];

        for (const match of localCitations) {
            const localNumber = parseInt(match[1]);
            const originalSource = result.sources.find(s => s.number === localNumber);

            if (originalSource) {
                const sourceKey = `${originalSource.file_id}-${originalSource.pageNumber}-${originalSource.content.slice(0, 50)}`;
                let finalNumber;
                if (sourceMap.has(sourceKey)) {
                    finalNumber = sourceMap.get(sourceKey)!;
                } else {
                    finalNumber = nextSourceNumber;
                    sourceMap.set(sourceKey, finalNumber);
                    finalSources.push({ ...originalSource, number: finalNumber });
                    nextSourceNumber++;
                }
                renumberedAnswer = renumberedAnswer.replace(match[0], `[Source ${finalNumber}]`);
            }
        }
        finalResponseText += `**${result.question}**\n${renumberedAnswer}\n\n`;
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