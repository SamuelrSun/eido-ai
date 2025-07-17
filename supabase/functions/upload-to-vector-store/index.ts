// supabase/functions/upload-to-vector-store/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import * as pdfjs from 'npm:pdfjs-dist@4.4.168/legacy/build/pdf.mjs';
import { corsHeaders } from '../_shared/cors.ts';

interface QueueRecord {
  id: number;
  user_id: string;
  class_id: string;
  folder_id: string | null;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size: number;
}

// NEW: A more robust text extraction function for pdf.js
async function getTextFromPdfPage(page: any): Promise<string> {
  const textContent = await page.getTextContent();
  let lastY = -1;
  let text = '';
  // Sort items by their vertical, then horizontal position
  const items = textContent.items.sort((a: any, b: any) => {
    if (a.transform[5] < b.transform[5]) return 1;
    if (a.transform[5] > b.transform[5]) return -1;
    if (a.transform[4] < b.transform[4]) return -1;
    if (a.transform[4] > b.transform[4]) return 1;
    return 0;
  });

  for (const item of items) {
    if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
      text += '\n';
    }
    text += item.str;
    lastY = item.transform[5];
  }
  return text;
}


function chunkText(text: string, chunkSize = 1000, overlap = 100): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    chunks.push(text.slice(i, end));
    i += chunkSize - overlap;
    if (end === text.length) break;
  }
  return chunks;
}

async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-ada-002',
    }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI embedding failed: ${error}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

serve(async (req: Request) => {
  console.log(`[TEXT-ENGINE START] 'upload-to-vector-store' invoked.`);

  try {
    const { record }: { record: QueueRecord } = await req.json();
    const { id: queueId, original_name, mime_type, storage_path, class_id, folder_id, user_id, size } = record;
    console.log(`[JOB] Received job #${queueId} for file: ${original_name}`);

    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const weaviateClient: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: Deno.env.get('WEAVIATE_URL')!,
      apiKey: new ApiKey(Deno.env.get('WEAVIATE_API_KEY')!),
      headers: { 'X-OpenAI-Api-Key': Deno.env.get('OPENAI_API_KEY')! },
    });

    await adminSupabaseClient.from('processing_queue').update({ status: 'processing' }).eq('id', queueId);

    let fileId = '';

    try {
      const documentTitle = original_name.substring(0, original_name.lastIndexOf('.')) || original_name;
      const { data: newFileRecord, error: insertError } = await adminSupabaseClient
        .from('files')
        .insert({
          name: original_name,
          size,
          type: mime_type,
          user_id,
          class_id,
          folder_id,
          status: 'processing',
          document_title: documentTitle,
        })
        .select('file_id')
        .single();
      if (insertError) throw insertError;
      fileId = newFileRecord.file_id;
      console.log(`  [DB-INSERT] ✅ Record created with file_id: ${fileId}`);
      const { data: fileData, error: downloadError } = await adminSupabaseClient.storage
        .from('file_storage')
        .download(storage_path);
      if (downloadError) throw downloadError;

      const fileBuffer = await fileData.arrayBuffer();
      const { data: { publicUrl } } = adminSupabaseClient.storage.from('file_storage').getPublicUrl(storage_path);
      const allTextChunks: { page_number: number; text_chunk: string }[] = [];
      let pageCount = 0;
      console.log(`  [PARSE] Parsing content for MIME type: ${mime_type}`);
      if (mime_type === 'application/pdf') {
        const pdfDoc = await pdfjs.getDocument(fileBuffer).promise;
        pageCount = pdfDoc.numPages;

        for (let i = 1; i <= pageCount; i++) {
          const page = await pdfDoc.getPage(i);
          // MODIFIED: Use the new, more robust text extraction method
          const pageText = await getTextFromPdfPage(page);
          
          // MODIFICATION: Clean the extracted text to remove slide footers and normalize whitespace
          const cleanedText = pageText
            .replace(/© 2025 Grant Derderian/g, '')
            .replace(/This content is protected and may not be shared, uploaded, or distributed\./g, '')
            .replace(/SLIDE {}/g, '')
            .replace(/---/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          chunkText(cleanedText).forEach(chunk => allTextChunks.push({ page_number: i, text_chunk: chunk }));
        }

        console.log(`  [PARSE] ✅ Extracted text from ${pageCount} PDF pages.`);
      } else if (mime_type.startsWith('text/')) {
        const textContent = new TextDecoder().decode(fileBuffer);
        pageCount = 1;
        chunkText(textContent).forEach(chunk => allTextChunks.push({ page_number: 1, text_chunk: chunk }));
        console.log(`  [PARSE] ✅ Extracted text from plain text file.`);
      } else {
        console.log(`  [PARSE] ⚠️ No text extraction logic for this file type: ${mime_type}. File will be tracked, but its content won't be searchable via text.`);
        pageCount = 1; 
      }

      if (allTextChunks.length > 0) {
        // NEW: Comprehensive logging of all generated chunks before indexing.
        console.log(`\n--- BEGIN CHUNK VERIFICATION (File: ${original_name}) ---\nTotal Chunks: ${allTextChunks.length}\n`);
        console.log(JSON.stringify(allTextChunks, null, 2));
        console.log(`\n--- END CHUNK VERIFICATION ---\n`);

        console.log(`  [WEAVIATE-INGEST] Indexing ${allTextChunks.length} total text chunks...`);
        let batcher = weaviateClient.batch.objectsBatcher();

        for (let i = 0; i < allTextChunks.length; i++) {
          const chunkData = allTextChunks[i];
          try {
            const vector = await getEmbedding(chunkData.text_chunk);
            batcher = batcher.withObject({
              class: 'DocumentChunk',
              properties: {
                text_chunk: chunkData.text_chunk,
                source_file_id: fileId,
                source_file_name: original_name,
                user_id,
                class_id,
                folder_id,
                page_number: chunkData.page_number,
                content_type: 'text_chunk',
                chunk_index: i,
              },
              vector: vector,
            });
          } catch (embeddingErr) {
            console.error(`  [EMBEDDING-FAIL] Failed on chunk ${i}: ${embeddingErr.message}`);
          }
        }

        await batcher.do();
        console.log(`  [WEAVIATE-INGEST] ✅ Successfully indexed text chunks.`);
      }

      console.log(`  [DB-UPDATE] Finalizing file record...`);
      await adminSupabaseClient
        .from('files')
        .update({ status: 'processed_text', url: publicUrl, page_count: pageCount })
        .eq('file_id', fileId);
      await adminSupabaseClient.from('processing_queue').update({ status: 'completed' }).eq('id', queueId);
      console.log(`  [DB-UPDATE] ✅ Record finalized for file_id: ${fileId}. Text processing is complete.`);
      
      console.log(`  [JOB-CHAIN] Requesting preview generation for file_id: ${fileId}`);
      const { error: previewRequestError } = await adminSupabaseClient.functions.invoke('request-previews', {
        body: { file_id: fileId },
      });
      if (previewRequestError) {
        console.error(`  [JOB-CHAIN] ⚠️ Failed to queue preview generation:`, previewRequestError);
      } else {
        console.log(`  [JOB-CHAIN] ✅ Successfully queued preview generation.`);
      }

      return new Response(
        JSON.stringify({ success: true, message: `Successfully processed text for job #${queueId}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error(`[JOB-ERROR] Failed to process job #${queueId}:`, error);
      if (fileId) await adminSupabaseClient.from('files').update({ status: 'error' }).eq('file_id', fileId);
      await adminSupabaseClient
        .from('processing_queue')
        .update({ status: 'failed', error_message: error.message })
        .eq('id', queueId);
      throw error;
    }

  } catch (error) {
    console.error('[CRITICAL-ERROR] in text-engine function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});