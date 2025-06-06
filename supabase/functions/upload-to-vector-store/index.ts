// supabase/functions/upload-to-vector-store/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from "../_shared/cors.ts";
// FIX: Correctly import the pdf-parse library
import pdf from 'npm:pdf-parse';
import mammoth from 'npm:mammoth@1.6.0';

interface FilePayload {
  url: string; name: string; type: string; file_id: string; folder_id: string | null;
}
interface RequestBody {
  files: FilePayload[]; class_id: string;
}

async function extractTextFromFile(fileBuffer: ArrayBuffer, contentType: string): Promise<string> {
    if (contentType === 'application/pdf') {
        // The library expects a Buffer, so we create one from the ArrayBuffer
        const data = await pdf(fileBuffer);
        return data.text;
    } else if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const { value } = await mammoth.extractRawText({ arrayBuffer: fileBuffer });
        return value;
    } else if (contentType.startsWith('text/')) {
        return new TextDecoder().decode(fileBuffer);
    }
    return '';
}

function chunkText(text: string, chunkSize = 1000, chunkOverlap = 100): string[] {
    const chunks: string[] = [];
    if (!text) return chunks;
    let i = 0;
    while (i < text.length) {
        const end = Math.min(i + chunkSize, text.length);
        chunks.push(text.substring(i, end));
        i = end - (end < text.length ? chunkOverlap : 0);
    }
    return chunks.filter(chunk => chunk.trim() !== '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  console.log("[Upload Function] Received request.");

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    console.log(`[Upload Function] Authenticated user: ${user.id}`);


    const { files, class_id }: RequestBody = await req.json();
    if (!files?.length || !class_id) throw new Error('Request body must include a "files" array and a "class_id".');
    console.log(`[Upload Function] Received ${files.length} files to process for class_id: ${class_id}`);


    const weaviateHost = Deno.env.get("WEAVIATE_URL");
    const weaviateApiKey = Deno.env.get("WEAVIATE_API_KEY");
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!weaviateHost || !weaviateApiKey || !openAIApiKey) throw new Error('Weaviate/OpenAI secrets not configured.');
    console.log("[Upload Function] All secrets found. Initializing Weaviate client.");

    const weaviateClient: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: weaviateHost,
      apiKey: new ApiKey(weaviateApiKey),
      headers: { 'X-OpenAI-Api-Key': openAIApiKey },
    });

    const results = [];
    for (const file of files) {
      try {
        console.log(`[Upload Function] Processing file: ${file.name} (ID: ${file.file_id})`);
        const fileResponse = await fetch(file.url);
        if (!fileResponse.ok) throw new Error(`Fetch failed for ${file.name}: ${fileResponse.statusText}`);
        
        const fileBuffer = await fileResponse.arrayBuffer();
        console.log(`[Upload Function] Fetched file buffer for ${file.name}, size: ${fileBuffer.byteLength}`);

        const text = await extractTextFromFile(fileBuffer, file.type);
        if (!text.trim()) {
            console.log(`[Upload Function] Skipped ${file.name} because it has no text content.`);
            results.push({ fileName: file.name, success: true, message: 'Skipped (no text content)' });
            continue;
        }

        const chunks = chunkText(text);
        if (chunks.length === 0) {
            console.log(`[Upload Function] Skipped ${file.name} because no text chunks were created.`);
            results.push({ fileName: file.name, success: true, message: 'Skipped (no chunks created)' });
            continue;
        }
        console.log(`[Upload Function] Created ${chunks.length} chunks for ${file.name}.`);

        const weaviateObjects = chunks.map((chunk, index) => ({
          class: "DocumentChunk",
          properties: {
            text_chunk: chunk,
            source_file_id: file.file_id,
            class_db_id: class_id,
            user_id: user.id,
            chunk_index: index,
          },
        }));

        console.log(`[Upload Function] Preparing to batch import ${weaviateObjects.length} objects for ${file.name}.`);
        console.log(`[Upload Function] Sample object properties: ${JSON.stringify(weaviateObjects[0].properties)}`);

        let batcher = weaviateClient.batch.objectsBatcher();
        for (const obj of weaviateObjects) {
          batcher = batcher.withObject(obj);
        }
        const res = await batcher.do();
        console.log(`[Upload Function] Weaviate batch response for ${file.name}:`, res);
        
        const errors = res.filter(item => item.result?.errors);
        if (errors.length > 0) {
          console.error(`[Upload Function] Weaviate batch import failed for ${file.name}:`, JSON.stringify(errors, null, 2));
          throw new Error(`Failed to import ${errors.length} chunks for file ${file.name}.`);
        }

        results.push({ fileName: file.name, success: true, chunksImported: weaviateObjects.length });
        console.log(`[Upload Function] Successfully processed ${file.name}.`);

      } catch (e) {
        console.error(`[Upload Function] Error processing file ${file.name}:`, e.message);
        results.push({ fileName: file.name, success: false, error: e.message });
      }
    }
    
    return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Critical error in upload-to-vector-store function:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
