// supabase/functions/upload-to-vector-store/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from "../_shared/cors.ts";
import pdf from 'npm:pdf-parse@1.1.1';
import mammoth from 'npm:mammoth@1.6.0';

interface FileStoragePayload {
  storage_path: string;
  original_name: string;
  mime_type: string;
  size: number;
  class_id: string;
  folder_id: string | null;
}

interface RequestBody {
  files: FileStoragePayload[];
}

async function extractTextFromFile(fileBuffer: ArrayBuffer, contentType: string): Promise<string> {
    if (contentType === 'application/pdf') {
        const data = await pdf(fileBuffer);
        return data.text;
    } else if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const { value } = await mammoth.extractRawText({ arrayBuffer: fileBuffer });
        return value;
    } else if (contentType.startsWith('text/')) {
        return new TextDecoder().decode(fileBuffer);
    }
    console.warn(`Unsupported content type for text extraction: ${contentType}`);
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
  
  try {
    const supabaseAdminClient: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user } } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    ).auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { files }: RequestBody = await req.json();
    if (!files?.length) throw new Error('Request body must include a "files" array.');

    const weaviateHost = Deno.env.get("WEAVIATE_URL");
    const weaviateApiKey = Deno.env.get("WEAVIATE_API_KEY");
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!weaviateHost || !weaviateApiKey || !openAIApiKey) throw new Error('Weaviate/OpenAI secrets not configured.');
    const weaviateClient: WeaviateClient = weaviate.client({
      scheme: 'https', host: weaviateHost, apiKey: new ApiKey(weaviateApiKey),
      headers: { 'X-OpenAI-Api-Key': openAIApiKey },
    });
    const results = [];
    for (const file of files) {
      try {
        const { data: urlData } = supabaseAdminClient.storage.from('file_storage').getPublicUrl(file.storage_path);
        if (!urlData.publicUrl) throw new Error(`Could not get public URL for ${file.storage_path}`);
        const { data: dbFile, error: dbError } = await supabaseAdminClient
          .from('files')
          .insert({
              name: file.original_name, size: file.size, type: file.mime_type,
              url: urlData.publicUrl, user_id: user.id, class_id: file.class_id,
              folder_id: file.folder_id,
              status: 'processing',
          })
          .select()
          .single();
        if (dbError) throw new Error(`Database insert failed for ${file.original_name}: ${dbError.message}`);
        const { data: fileBuffer, error: downloadError } = await supabaseAdminClient.storage
            .from('file_storage')
            .download(file.storage_path);
        if (downloadError) throw new Error(`Failed to download ${file.original_name}: ${downloadError.message}`);
        
        const text = await extractTextFromFile(await fileBuffer.arrayBuffer(), file.mime_type);
        if (text.trim()) {
            const chunks = chunkText(text);
            const weaviateObjects = chunks.map((chunk, index) => ({
              class: "DocumentChunk",
              properties: {
                text_chunk: chunk, 
                source_file_id: dbFile.file_id,
                user_id: user.id, 
                class_id: file.class_id, // ADDED: Pass class_id to Weaviate
                chunk_index: index,
              },
            }));

            console.log(`--- [UPLOAD DEBUG] Preparing to batch import ${weaviateObjects.length} chunks for file_id: ${dbFile.file_id}.`);
            console.log(`--- [UPLOAD DEBUG] Data for first chunk: ${JSON.stringify(weaviateObjects[0], null, 2)}`);

            if (weaviateObjects.length > 0) {
                let batcher = weaviateClient.batch.objectsBatcher();
                for (const obj of weaviateObjects) { batcher = batcher.withObject(obj); }
                const res = await batcher.do();
                const errors = res.filter(item => item.result?.errors);
                if (errors.length > 0) throw new Error(`Failed to import ${errors.length} chunks to Weaviate.`);
            }
        }

        const { data: updatedFile, error: updateError } = await supabaseAdminClient
            .from('files')
            .update({ status: 'complete' })
            .eq('file_id', dbFile.file_id)
            .select()
            .single();
        if (updateError) throw new Error(`Failed to update file status: ${updateError.message}`);
        // FIX for updatedFile possibly being null
        if (updatedFile) {
          results.push({ ...updatedFile, success: true });
        }

      } catch (e) {
        // FIX for unknown error type
        const errorMessage = e instanceof Error ? e.message : String(e);
        results.push({ original_name: file.original_name, success: false, error: errorMessage });
      }
    }
    
    return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});