// supabase/functions/oracle-chat/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import * as pdfjs from 'npm:pdfjs-dist@4.4.168/legacy/build/pdf.mjs';
import { corsHeaders } from '../_shared/cors.ts';

const WEAVIATE_URL = Deno.env.get('WEAVIATE_URL');
const WEAVIATE_API_KEY = Deno.env.get('WEAVIATE_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// --- TYPE DEFINITIONS ---
interface AttachedFile {
  name: string;
  type: string;
  content: string; // Base64 encoded
}

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

// --- HELPERS ---
const base64ToUint8Array = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

async function getTextFromPdfPage(page: any): Promise<string> {
  const textContent = await page.getTextContent();
  return textContent.items.map((item: any) => item.str).join(' ');
}

/**
 * Extract text from files sent in the request (PDF, images via GPT-4o vision, or plain text).
 */
async function extractTextFromTemporaryFiles(files: AttachedFile[]): Promise<string> {
  if (!files || files.length === 0) return "";
  console.log(`[TEMP-FILE-EXTRACTION] Starting extraction for ${files.length} attached files.`);

  let combinedText = "";

  for (const file of files) {
    try {
      let fileText = `\n\n--- Attached: ${file.name} (${file.type}) ---\n`;
      if (file.type === 'application/pdf') {
        const pdfData = base64ToUint8Array(file.content);
        const pdf = await pdfjs.getDocument(pdfData).promise;
        console.log(`[TEMP-FILE-EXTRACTION] PDF "${file.name}" has ${pdf.numPages} page(s).`);
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await getTextFromPdfPage(page);
          fileText += `\n[Page ${i}]\n${text}\n`;
        }
      } else if (file.type.startsWith('image/')) {
        const gpt4oResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY!}`
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: "Describe the content of this image in detail. If there is text, transcribe it exactly." },
                { type: "image_url", image_url: { url: `data:${file.type};base64,${file.content}` } }
              ]
            }],
            max_tokens: 1000,
          })
        });
        if (!gpt4oResponse.ok) throw new Error(`GPT-4o API error for image ${file.name}: ${await gpt4oResponse.text()}`);
        const result = await gpt4oResponse.json();
        fileText += result.choices[0].message.content;
      } else {
        // Fallback for plain text or other unsupported types
        fileText += atob(file.content);
      }
      combinedText += fileText;
    } catch (error) {
      console.error(`Error processing attached file ${file.name}:`, error);
      combinedText += `\n\n--- Error processing file "${file.name}" ---`;
    }
  }
  console.log(`[TEMP-FILE-EXTRACTION] Finished extraction.`);
  return combinedText;
}

/**
 * Performs RAG for a single query, combining context from Weaviate and temporary files.
 */
async function processSingleQuery(
  query: string,
  temporaryFileContext: string,
  weaviateClient: WeaviateClient,
  adminSupabaseClient: SupabaseClient,
  user_id: string,
  class_id: string | null
): Promise<ProcessedResult> {

  console.log(`[RAG-STEP] Processing query: "${query}"`);

  // Security check: ensure user is a member of the class if a class_id is provided
  if (class_id) {
    const { data: member, error: memberError } = await adminSupabaseClient
      .from('class_members')
      .select('role')
      .eq('class_id', class_id)
      .eq('user_id', user_id)
      .in('role', ['owner', 'member'])
      .maybeSingle();
    if (memberError) throw new Error(`Database error checking membership: ${memberError.message}`);
    if (!member) throw new Error("Permission denied: You are not a member of this class.");
  }

  // Embed the user query
  const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY!}` },
    body: JSON.stringify({ input: query, model: "text-embedding-3-small" }),
  });
  if (!embeddingResponse.ok) throw new Error(`Failed to create embedding for query: "${query}"`);
  const embeddingData = await embeddingResponse.json();
  const queryVector = embeddingData.data[0].embedding;

  // Weaviate semantic search with proper scoping
  const wq = weaviateClient.graphql.get()
    .withClassName('DocumentChunk')
    .withNearVector({ vector: queryVector })
    .withLimit(10)
    .withFields('source_file_id page_number text_chunk source_file_name');

  const whereFilter: any = {};
  if (class_id) {
    whereFilter.operator = 'Equal';
    whereFilter.path = ['class_id'];
    whereFilter.valueText = class_id;
  } else {
    // All classes: scope to user
    whereFilter.operator = 'Equal';
    whereFilter.path = ['user_id'];
    whereFilter.valueText = user_id;
  }
  wq.withWhere(whereFilter);

  const weaviateResponse = await wq.do();
  const retrievedChunks = weaviateResponse?.data?.Get?.DocumentChunk || [];

  let sourcesForLLM: ActiveSource[] = [];
  let weaviateContext = "";

  if (retrievedChunks.length > 0) {
    // FIX: collect an array of ids, not an array containing a Set
    const uniqueFileIds: string[] = Array.from(
      new Set(retrievedChunks.map((chunk: any) => chunk.source_file_id))
    );

    // Fetch file metadata for source mapping
    const { data: filesData, error: filesErr } = await adminSupabaseClient
      .from('files')
      .select('file_id, name, type, url')
      .in('file_id', uniqueFileIds);

    if (filesErr) {
      console.warn('[RAG-STEP] Warning: could not fetch files metadata:', filesErr.message);
    }

    const fileMap = new Map((filesData || []).map(file => [file.file_id, file] as const));

    weaviateContext = retrievedChunks.map((chunk: any, index: number) => {
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
  }

  // System instruction for the LLM
  const systemPrompt = `You are an academic assistant. Your primary goal is to answer the user's question using ONLY the information from the provided context. The context may come from two places: temporarily "Attached Content" and permanently stored "Sources".
- Synthesize a detailed answer based on all provided text.
- When you use information from a numbered "Source", you MUST cite it with the corresponding source number, like [Source X].
- When you use information from the "Attached Content", you should state that the information comes from the attached file (e.g., "According to the attached document...").
- If the combined context is insufficient, state that you cannot answer based on the information provided.
- Do not make up information. Your entire answer must be derived from the provided context.`;

  const finalContext = `${temporaryFileContext}\n\n${weaviateContext}`.trim();

  if (finalContext === "") {
    return {
      question: query,
      answer: "I could not find any information on this topic in your class materials or attached files.",
      sources: []
    };
  }

  // Ask OpenAI for the final answer
  const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY!}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `User Question: "${query}"\n\nContext:\n${finalContext}` }
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
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const weaviateClient: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: WEAVIATE_URL!,
      apiKey: new ApiKey(WEAVIATE_API_KEY!),
      headers: { 'X-OpenAI-Api-Key': OPENAI_API_KEY! },
    });

    // User auth
    const { data: { user } } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    ).auth.getUser();
    if (!user) throw new Error('Authentication error.');

    // Parse input
    const { message, class_id, files } = await req.json();
    if (!message && (!files || files.length === 0)) {
      throw new Error("Missing 'message' or 'files' in request body.");
    }

    // Extract any temporary file context first
    const temporaryFileContext = await extractTextFromTemporaryFiles(files || []);

    // Split possible multi-question prompts (bullet list, new lines)
    const questions: string[] = message
      ? message
          .trim()
          .split('\n')
          .map((q: string) => q.trim().replace(/^[•\*\-]\s*/, ''))
          .filter((q: string) => q.length > 5)
      : [""];

    if (questions.length === 0 && message) questions.push(message.trim());

    // FIX: guard access to files when undefined
    if (questions.length === 0 && (files?.length ?? 0) > 0) {
      questions.push("Summarize the attached file(s).");
    }

    // Process each question, renumbering sources across questions
    const finalSources: ActiveSource[] = [];
    let finalResponseText = "";

    for (const q of questions) {
      const result = await processSingleQuery(
        q,
        temporaryFileContext,
        weaviateClient,
        adminSupabaseClient,
        user.id,
        class_id || null
      );

      // Deduplicate & renumber sources across questions
      const oldToNewSourceNumberMap = new Map<number, number>();
      for (const s of result.sources) {
        // Use file_id + pageNumber + content hash-ish key; simplest: concat
        const key = `${s.file_id || s.file.file_id}__${s.pageNumber}__${s.content}`;
        let existingIdx = finalSources.findIndex(
          fs => `${fs.file_id || fs.file.file_id}__${fs.pageNumber}__${fs.content}` === key
        );
        if (existingIdx === -1) {
          const newNumber = finalSources.length + 1;
          finalSources.push({ ...s, number: newNumber });
          oldToNewSourceNumberMap.set(s.number, newNumber);
        } else {
          oldToNewSourceNumberMap.set(s.number, finalSources[existingIdx].number);
        }
      }

      // Rewrite [Source X] tags to the new numbering
      const renumberedAnswer = result.answer.replace(/\[Source (\d+)]/g, (_m, oldNumStr) => {
        const oldNum = parseInt(oldNumStr, 10);
        const newNum = oldToNewSourceNumberMap.get(oldNum);
        return newNum !== undefined ? `[Source ${newNum}]` : `[Source ${oldNum}]`;
      });

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
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

