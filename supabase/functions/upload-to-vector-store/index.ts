// supabase/functions/upload-to-vector-store/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import * as pdfjs from 'npm:pdfjs-dist@4.4.168/legacy/build/pdf.mjs';
import { corsHeaders } from '../_shared/cors.ts';

// --- CONFIGURATION ---
const PAGES_PER_BATCH = 3; // Reduced batch size due to more intensive processing per page.

// --- TYPE DEFINITIONS ---
interface QueueRecord {
  id: number; user_id: string; class_id: string; folder_id: string | null;
  storage_path: string; original_name: string; mime_type: string; size: number;
}
interface ChainedInvocationPayload {
  file_id: string; storage_path: string; user_id: string; class_id: string; folder_id: string | null;
  original_name: string; current_page: number; total_pages: number;
}

// --- HELPER FUNCTIONS ---

/**
 * Extracts structured text content from a single PDF page.
 */
async function getTextFromPdfPage(page: any): Promise<string> {
  const textContent = await page.getTextContent();
  return textContent.items.map((item: any) => item.str).join(' ');
}

/**
 * NEW: Extracts images from a PDF page, converts them to base64, and gets AI descriptions.
 */
async function processImagesOnPage(page: any, pageNumber: number): Promise<string[]> {
    const descriptions: string[] = [];
    try {
        const opList = await page.getOperatorList();
        const imageOps = opList.fnArray.reduce((indices: number[], fn, index: number) => {
            if (fn === pdfjs.OPS.paintImageXObject) {
                indices.push(index);
            }
            return indices;
        }, []);

        if (imageOps.length === 0) return [];
        console.log(`      [IMAGE-PROCESS] Found ${imageOps.length} image(s) on page ${pageNumber}.`);

        for (const opIndex of imageOps) {
            const imageName = opList.argsArray[opIndex][0];
            const img = await page.objs.get(imageName);
            
            // Create a temporary canvas to render the image and convert to base64
            // Deno doesn't have a native canvas, so we create a minimal one.
            const canvas = {
                width: img.width,
                height: img.height,
                getContext: () => ({
                    drawImage: () => {},
                    getImageData: () => ({ data: new Uint8ClampedArray(img.data) }),
                }),
                toDataURL: () => {
                     // Basic PNG base64 conversion (simplified for this environment)
                    const data = `data:image/jpeg;base64,${btoa(String.fromCharCode(...img.data))}`;
                    return data;
                }
            };

            const imageBase64 = canvas.toDataURL();

            const gpt4oResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')!}` },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [{
                        role: "user",
                        content: [
                            { type: "text", text: `This is an image from page ${pageNumber} of a document. Describe it in detail as if you were creating alt-text for a screen reader. If it's a diagram, explain its parts and relationships. If it contains text, transcribe it. Prefix the entire description with "[Image Description]:".` },
                            { type: "image_url", image_url: { url: imageBase64, detail: "low" } }
                        ]
                    }],
                    max_tokens: 500,
                })
            });

            if (!gpt4oResponse.ok) continue; // Skip failed images
            const result = await gpt4oResponse.json();
            const description = result.choices[0]?.message?.content;
            if (description) {
                descriptions.push(description);
            }
        }
    } catch (error) {
        console.error(`      [IMAGE-PROCESS-ERROR] Failed to process images on page ${pageNumber}:`, error.message);
    }
    return descriptions;
}

function chunkText(text: string, chunkSize = 1000, overlap = 100): string[] {
  const chunks: string[] = []; if (!text) return chunks;
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
    method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: text, model: 'text-embedding-3-small' }),
  });
  if (!res.ok) throw new Error(`OpenAI embedding failed: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

/**
 * Main processing logic for a batch of pages, now including image processing.
 */
async function processPdfBatch(supabaseAdminClient: SupabaseClient, weaviateClient: WeaviateClient, payload: ChainedInvocationPayload) {
  const { file_id, storage_path, user_id, class_id, folder_id, original_name, current_page, total_pages } = payload;
  const startPage = current_page;
  const endPage = Math.min(startPage + PAGES_PER_BATCH - 1, total_pages);

  console.log(`  [BATCH-PROCESS] Processing pages ${startPage}-${endPage} of ${total_pages} for file_id: ${file_id}`);
  const { data: fileData, error: downloadError } = await supabaseAdminClient.storage.from('file_storage').download(storage_path);
  if (downloadError) throw downloadError;
  const fileBuffer = await fileData.arrayBuffer();
  const pdfDoc = await pdfjs.getDocument(fileBuffer).promise;

  const allTextChunks: { page_number: number; text_chunk: string }[] = [];
  
  for (let i = startPage; i <= endPage; i++) {
    const page = await pdfDoc.getPage(i);
    // Process text and images in parallel for each page
    const [pageText, imageDescriptions] = await Promise.all([
        getTextFromPdfPage(page),
        processImagesOnPage(page, i)
    ]);
    const cleanedText = pageText.replace(/\s+/g, ' ').trim();
    const combinedPageContent = `${cleanedText}\n\n${imageDescriptions.join('\n\n')}`.trim();

    chunkText(combinedPageContent).forEach(chunk => allTextChunks.push({ page_number: i, text_chunk: chunk }));
  }
  console.log(`  [BATCH-PROCESS] Extracted ${allTextChunks.length} enriched text chunks from this batch.`);

  if (allTextChunks.length > 0) {
    let batcher = weaviateClient.batch.objectsBatcher();
    for (const [index, chunkData] of allTextChunks.entries()) {
      const vector = await getEmbedding(chunkData.text_chunk);
      batcher = batcher.withObject({
        class: 'DocumentChunk',
        properties: {
          text_chunk: chunkData.text_chunk, source_file_id: file_id, source_file_name: original_name,
          user_id, class_id, folder_id, page_number: chunkData.page_number, content_type: 'text_chunk',
          chunk_index: ((startPage - 1) * 1000) + index,
        },
        vector: vector,
      });
    }
    await batcher.do();
    console.log(`  [WEAVIATE-INGEST] ✅ Indexed ${allTextChunks.length} chunks for pages ${startPage}-${endPage}.`);
  }

  if (endPage < total_pages) {
    const nextPayload: ChainedInvocationPayload = { ...payload, current_page: endPage + 1 };
    await supabaseAdminClient.functions.invoke('upload-to-vector-store', { body: nextPayload });
    console.log(`  [JOB-CHAIN] ⛓️ Queued next batch starting at page ${endPage + 1}.`);
  } else {
    console.log(`  [FINALIZE] This was the last batch. Finalizing file record for file_id: ${file_id}`);
    const { data: { publicUrl } } = supabaseAdminClient.storage.from('file_storage').getPublicUrl(storage_path);
    await supabaseAdminClient.from('files').update({ status: 'processed_text', url: publicUrl, page_count: total_pages }).eq('file_id', file_id);
    await supabaseAdminClient.functions.invoke('request-previews', { body: { file_id: file_id } });
    console.log(`  [FINALIZE] ✅ File record finalized and preview generation requested.`);
  }
}

// Main serverless function handler
serve(async (req: Request) => {
  console.log(`[TEXT-ENGINE START] 'upload-to-vector-store' invoked.`);
  const adminSupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const weaviateClient: WeaviateClient = weaviate.client({
    scheme: 'https', host: Deno.env.get('WEAVIATE_URL')!, apiKey: new ApiKey(Deno.env.get('WEAVIATE_API_KEY')!),
  });
  
  const payload = await req.json();

  if (payload.record) { // Initial trigger
    const record: QueueRecord = payload.record;
    const { id: queueId, original_name, mime_type, storage_path, class_id, folder_id, user_id, size } = record;
    console.log(`[JOB] Received initial job #${queueId} for file: ${original_name}`);
    await adminSupabaseClient.from('processing_queue').update({ status: 'processing' }).eq('id', queueId);
    
    let fileId = '';
    try {
      const documentTitle = original_name.substring(0, original_name.lastIndexOf('.')) || original_name;
      const { data: newFileRecord, error: insertError } = await adminSupabaseClient
        .from('files').insert({ name: original_name, size, type: mime_type, user_id, class_id, folder_id, status: 'processing', document_title: documentTitle })
        .select('file_id').single();
      if (insertError) throw insertError;
      fileId = newFileRecord.file_id;
      console.log(`  [DB-INSERT] ✅ Record created with file_id: ${fileId}`);
      
      const { data: fileData, error: downloadError } = await adminSupabaseClient.storage.from('file_storage').download(storage_path);
      if (downloadError) throw downloadError;
      const fileBuffer = await fileData.arrayBuffer();

      if (mime_type === 'application/pdf') {
        const pdfDoc = await pdfjs.getDocument(fileBuffer).promise;
        const totalPages = pdfDoc.numPages;
        if (totalPages > 0) {
            const initialPayload: ChainedInvocationPayload = { file_id: fileId, storage_path, user_id, class_id, folder_id, original_name, current_page: 1, total_pages: totalPages };
            await processPdfBatch(adminSupabaseClient, weaviateClient, initialPayload);
        } else {
             const { data: { publicUrl } } = adminSupabaseClient.storage.from('file_storage').getPublicUrl(storage_path);
             await adminSupabaseClient.from('files').update({ status: 'processed_text', url: publicUrl, page_count: 0 }).eq('file_id', fileId);
             await adminSupabaseClient.functions.invoke('request-previews', { body: { file_id: fileId } });
        }
      } else { // Handle non-PDFs (including standalone images)
        console.log(`  [PARSE] Non-PDF file type: ${mime_type}. Processing as single entity.`);
        let combinedText = "";
        if (mime_type.startsWith('image/')) {
            const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
            combinedText = await processImagesOnPage({ objs: { get: () => ({ width: 0, height: 0, data: new Uint8Array(fileBuffer) }) } } as any, 1).then(d => d.join('\n\n'));
        } else if (mime_type.startsWith('text/')) {
            combinedText = new TextDecoder().decode(fileBuffer);
        }
        
        if (combinedText) {
            const chunks = chunkText(combinedText);
            let batcher = weaviateClient.batch.objectsBatcher();
            for (const chunk of chunks) {
                const vector = await getEmbedding(chunk);
                batcher = batcher.withObject({
                    class: 'DocumentChunk', properties: { text_chunk: chunk, source_file_id: fileId, source_file_name: original_name, user_id, class_id, folder_id, page_number: 1 }, vector: vector
                });
            }
            await batcher.do();
        }
        
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
      throw error;
    }
  } else { // Chained invocation
    const chainedPayload: ChainedInvocationPayload = payload;
    console.log(`[JOB] Received chained job for file_id: ${chainedPayload.file_id}, starting at page ${chainedPayload.current_page}`);
    try {
        await processPdfBatch(adminSupabaseClient, weaviateClient, chainedPayload);
    } catch (error) {
      console.error(`[JOB-ERROR] Failed to process chained job for file: ${chainedPayload.file_id}`, error);
      await adminSupabaseClient.from('files').update({ status: 'error' }).eq('file_id', chainedPayload.file_id);
    }
  }

  return new Response(JSON.stringify({ success: true, message: `Invocation successful.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});