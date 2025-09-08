// supabase/functions/upload-to-vector-store/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import * as pdfjs from 'npm:pdfjs-dist@4.4.168/legacy/build/pdf.mjs';
import { corsHeaders } from '../_shared/cors.ts';

// --- CONFIGURATION ---
const PAGES_PER_BATCH = 5; // Process 5 pages per invocation to stay within time limits.

// --- TYPE DEFINITIONS ---
// The record from the 'processing_queue' table that triggers the initial run.
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

// The payload for subsequent, chained function invocations.
interface ChainedInvocationPayload {
  file_id: string;
  storage_path: string;
  user_id: string;
  class_id: string;
  folder_id: string | null;
  original_name: string;
  current_page: number;
  total_pages: number;
}

// --- HELPER FUNCTIONS ---

/**
 * Extracts structured text content from a single PDF page.
 */
async function getTextFromPdfPage(page: any): Promise<string> {
  const textContent = await page.getTextContent();
  let lastY = -1;
  let text = '';
  // Sort items by their vertical position first, then horizontal.
  const items = textContent.items.sort((a: any, b: any) => {
    if (a.transform[5] < b.transform[5]) return 1;
    if (a.transform[5] > b.transform[5]) return -1;
    if (a.transform[4] < b.transform[4]) return -1;
    if (a.transform[4] > b.transform[4]) return 1;
    return 0;
  });

  for (const item of items) {
    if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
      text += '\n'; // Add a newline for significant vertical gaps.
    }
    text += item.str;
    lastY = item.transform[5];
  }
  return text;
}

/**
 * Chunks text into smaller pieces with overlap.
 */
function chunkText(text: string, chunkSize = 1000, overlap = 100): string[] {
  const chunks: string[] = [];
  if (!text) return chunks;
  
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    chunks.push(text.slice(i, end));
    i += chunkSize - overlap;
    if (end === text.length) break;
  }
  return chunks;
}

/**
 * Generates a vector embedding for a given text chunk using OpenAI's API.
 */
async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI embedding failed: ${error}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

/**
 * The main processing logic for a batch of pages from a PDF.
 */
async function processPdfBatch(
  supabaseAdminClient: SupabaseClient,
  weaviateClient: WeaviateClient,
  payload: ChainedInvocationPayload
) {
  const { file_id, storage_path, user_id, class_id, folder_id, original_name, current_page, total_pages } = payload;
  const startPage = current_page;
  const endPage = Math.min(startPage + PAGES_PER_BATCH - 1, total_pages);

  console.log(`  [BATCH-PROCESS] Processing pages ${startPage}-${endPage} of ${total_pages} for file_id: ${file_id}`);

  // Download the file from storage
  const { data: fileData, error: downloadError } = await supabaseAdminClient.storage
    .from('file_storage')
    .download(storage_path);
  if (downloadError) throw downloadError;

  const fileBuffer = await fileData.arrayBuffer();
  const pdfDoc = await pdfjs.getDocument(fileBuffer).promise;

  const allTextChunks: { page_number: number; text_chunk: string }[] = [];
  
  // Extract and chunk text for the current batch of pages
  for (let i = startPage; i <= endPage; i++) {
    const page = await pdfDoc.getPage(i);
    const pageText = await getTextFromPdfPage(page);
    const cleanedText = pageText.replace(/\s+/g, ' ').trim();
    chunkText(cleanedText).forEach(chunk => allTextChunks.push({ page_number: i, text_chunk: chunk }));
  }
  console.log(`  [BATCH-PROCESS] Extracted ${allTextChunks.length} text chunks from this batch.`);

  // Index the chunks in Weaviate
  if (allTextChunks.length > 0) {
    let batcher = weaviateClient.batch.objectsBatcher();
    for (const [index, chunkData] of allTextChunks.entries()) {
      const vector = await getEmbedding(chunkData.text_chunk);
      batcher = batcher.withObject({
        class: 'DocumentChunk',
        properties: {
          text_chunk: chunkData.text_chunk,
          source_file_id: file_id,
          source_file_name: original_name,
          user_id, class_id, folder_id,
          page_number: chunkData.page_number,
          content_type: 'text_chunk',
          chunk_index: ((startPage - 1) * 1000) + index, // Create a pseudo-unique index
        },
        vector: vector,
      });
    }
    await batcher.do();
    console.log(`  [WEAVIATE-INGEST] ✅ Indexed ${allTextChunks.length} chunks for pages ${startPage}-${endPage}.`);
  }

  // If there are more pages, chain the next invocation. Otherwise, finalize.
  if (endPage < total_pages) {
    const nextPayload: ChainedInvocationPayload = {
      ...payload,
      current_page: endPage + 1,
    };
    // Asynchronously invoke the next batch without waiting for it to complete.
    await supabaseAdminClient.functions.invoke('upload-to-vector-store', {
      body: nextPayload,
    });
    console.log(`  [JOB-CHAIN] ⛓️ Queued next batch starting at page ${endPage + 1}.`);
  } else {
    // This is the final batch. Finalize the file record.
    console.log(`  [FINALIZE] This was the last batch. Finalizing file record for file_id: ${file_id}`);
    const { data: { publicUrl } } = supabaseAdminClient.storage.from('file_storage').getPublicUrl(storage_path);
    await supabaseAdminClient
      .from('files')
      .update({ status: 'processed_text', url: publicUrl, page_count: total_pages })
      .eq('file_id', file_id);
    
    // Now that text processing is complete, request preview generation.
    await supabaseAdminClient.functions.invoke('request-previews', {
        body: { file_id: file_id },
    });
    console.log(`  [FINALIZE] ✅ File record finalized and preview generation requested.`);
  }
}

// The main serverless function handler
serve(async (req: Request) => {
  console.log(`[TEXT-ENGINE START] 'upload-to-vector-store' invoked.`);

  const adminSupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const weaviateClient: WeaviateClient = weaviate.client({
    scheme: 'https', host: Deno.env.get('WEAVIATE_URL')!, apiKey: new ApiKey(Deno.env.get('WEAVIATE_API_KEY')!),
  });
  
  const payload = await req.json();

  // Differentiate between initial trigger from DB and a chained call
  if (payload.record) { // Initial trigger from processing_queue
    const record: QueueRecord = payload.record;
    const { id: queueId, original_name, mime_type, storage_path, class_id, folder_id, user_id, size } = record;
    console.log(`[JOB] Received initial job #${queueId} for file: ${original_name}`);
    await adminSupabaseClient.from('processing_queue').update({ status: 'processing' }).eq('id', queueId);
    
    let fileId = '';
    try {
      const documentTitle = original_name.substring(0, original_name.lastIndexOf('.')) || original_name;
      const { data: newFileRecord, error: insertError } = await adminSupabaseClient
        .from('files').insert({
          name: original_name, size, type: mime_type, user_id, class_id, folder_id,
          status: 'processing', document_title: documentTitle,
        }).select('file_id').single();

      if (insertError) throw insertError;
      fileId = newFileRecord.file_id;
      console.log(`  [DB-INSERT] ✅ Record created with file_id: ${fileId}`);
      
      const { data: fileData, error: downloadError } = await adminSupabaseClient.storage.from('file_storage').download(storage_path);
      if (downloadError) throw downloadError;
      const fileBuffer = await fileData.arrayBuffer();

      // Only PDF text extraction is batched. Other types are processed in one go.
      if (mime_type === 'application/pdf') {
        const pdfDoc = await pdfjs.getDocument(fileBuffer).promise;
        const totalPages = pdfDoc.numPages;

        if (totalPages > 0) {
            const initialPayload: ChainedInvocationPayload = {
                file_id: fileId, storage_path, user_id, class_id, folder_id, original_name,
                current_page: 1, total_pages: totalPages,
            };
            await processPdfBatch(adminSupabaseClient, weaviateClient, initialPayload);
        } else {
             // Handle empty PDF case
             const { data: { publicUrl } } = adminSupabaseClient.storage.from('file_storage').getPublicUrl(storage_path);
             await adminSupabaseClient.from('files').update({ status: 'processed_text', url: publicUrl, page_count: 0 }).eq('file_id', fileId);
             await adminSupabaseClient.functions.invoke('request-previews', { body: { file_id: fileId } });
        }
      } else {
        // --- Handle other file types (e.g., plain text) in a single pass ---
        console.log(`  [PARSE] ⚠️ No batching logic for this file type: ${mime_type}. Processing in one go.`);
        const { data: { publicUrl } } = adminSupabaseClient.storage.from('file_storage').getPublicUrl(storage_path);
        await adminSupabaseClient.from('files').update({ status: 'processed_text', url: publicUrl, page_count: 1 }).eq('file_id', fileId);
        await adminSupabaseClient.functions.invoke('request-previews', { body: { file_id: fileId } });
      }

      await adminSupabaseClient.from('processing_queue').update({ status: 'completed' }).eq('id', queueId);
      console.log(`[JOB] ✅ Initial job #${queueId} processing initiated successfully.`);

    } catch (error) {
      console.error(`[JOB-ERROR] Failed to process initial job #${queueId}:`, error);
      if (fileId) await adminSupabaseClient.from('files').update({ status: 'error' }).eq('file_id', fileId);
      await adminSupabaseClient.from('processing_queue').update({ status: 'failed', error_message: error.message }).eq('id', queueId);
      // Re-throw to be caught by the final catch block.
      throw error;
    }

  } else { // Chained invocation
    const chainedPayload: ChainedInvocationPayload = payload;
    console.log(`[JOB] Received chained job for file_id: ${chainedPayload.file_id}, starting at page ${chainedPayload.current_page}`);
    try {
        await processPdfBatch(adminSupabaseClient, weaviateClient, chainedPayload);
    } catch (error) {
      console.error(`[JOB-ERROR] Failed to process chained job for file: ${chainedPayload.file_id}`, error);
      // Mark the main file record as failed
      await adminSupabaseClient.from('files').update({ status: 'error' }).eq('file_id', chainedPayload.file_id);
    }
  }

  return new Response(
    JSON.stringify({ success: true, message: `Invocation successful.` }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});