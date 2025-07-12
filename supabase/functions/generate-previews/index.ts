// supabase/functions/generate-previews/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Get Cloudinary config from environment variables
const CLOUDINARY_CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
const CLOUDINARY_API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

interface PreviewQueueRecord {
  id: number;
  file_id: string;
}

// MODIFIED: This is the corrected helper function for uploading to Cloudinary.
async function uploadToCloudinary(publicUrl: string, fileId: string) {
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const timestamp = Math.round((new Date()).getTime() / 1000);

    // 1. Define ALL parameters for the upload, including eager transformations.
    // This ensures every parameter is part of the signature string.
    const params: Record<string, string> = {
        public_id: `thumbnails/${fileId}`,
        timestamp: timestamp.toString(),
        // Eagerly apply transformations upon upload. This is the best practice.
        // f_auto: automatically select the best image format (e.g., webp, jpg).
        // q_auto: automatically adjust quality.
        // w_800: resize width to 800px. This creates a reasonably sized thumbnail.
        eager: 'f_auto,q_auto,w_800',
        overwrite: 'true', // Ensures that re-processing a file updates the thumbnail.
    };

    // 2. Create the string to sign by sorting the parameters alphabetically.
    const sortedParamsToSign = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');
    const signatureString = `${sortedParamsToSign}${CLOUDINARY_API_SECRET!}`;
    
    // 3. Generate the SHA-1 signature.
    const signature = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(signatureString))
        .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

    // 4. Build the FormData payload.
    const formData = new FormData();
    formData.append('file', publicUrl);
    formData.append('api_key', CLOUDINARY_API_KEY!);
    formData.append('signature', signature);
    // Add all the signed parameters to the form data
    for (const key in params) {
        formData.append(key, params[key]);
    }
    
    // 5. Make the API call.
    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cloudinary upload failed: ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    
    // 6. Get the secure URL of the *eagerly transformed* image.
    if (!responseData.eager || !responseData.eager[0]?.secure_url) {
        throw new Error("Cloudinary did not return an eager transformation URL.");
    }

    return responseData.eager[0].secure_url;
}


serve(async (req: Request) => {
  console.log(`[VISUAL-ENGINE START] 'generate-previews' invoked.`);
  try {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new Error("Cloudinary environment variables are not set.");
    }

    const { record: queueRecord }: { record: PreviewQueueRecord } = await req.json();
    const { id: queueId, file_id } = queueRecord;
    
    console.log(`[JOB] Received preview job #${queueId} for file_id: ${file_id}`);

    const adminSupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    await adminSupabaseClient.from('preview_queue').update({ status: 'processing' }).eq('id', queueId);

    try {
      const { data: file, error: fetchError } = await adminSupabaseClient.from('files').select('name, type, url').eq('file_id', file_id).single();
      if (fetchError || !file || !file.url) throw new Error(`Failed to fetch file data for ${file_id}: ${fetchError?.message}`);
      
      let generatedThumbnailUrl: string | null = null;
      
      console.log(`  [PROCESS] Starting visual processing for ${file.name} (${file.type})`);
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        console.log(`  [CLOUDINARY] Uploading ${file.url} to Cloudinary...`);
        // MODIFICATION: Call the corrected helper function.
        generatedThumbnailUrl = await uploadToCloudinary(file.url, file_id);
        console.log(`  [CLOUDINARY] ✅ Thumbnail successfully generated: ${generatedThumbnailUrl}`);
      } else {
        console.log(`  [PROCESS] ⚠️ No visual processing logic for this file type: ${file.type}.`);
      }

      console.log(`  [DB-UPDATE] Saving generated thumbnail to 'files' table...`);
      await adminSupabaseClient
        .from('files')
        .update({ thumbnail_url: generatedThumbnailUrl, status: 'complete' }) // Also update status to complete
        .eq('file_id', file_id);
      
      await adminSupabaseClient.from('preview_queue').update({ status: 'completed' }).eq('id', queueId);
      console.log(`  [DB-UPDATE] ✅ Thumbnail saved for file_id: ${file_id}.`);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    } catch(error) {
      console.error(`[JOB-ERROR] Failed to process preview job #${queueId}:`, error);
      await adminSupabaseClient.from('preview_queue').update({ status: 'failed', error_message: error.message }).eq('id', queueId);
      await adminSupabaseClient.from('files').update({ status: 'error' }).eq('file_id', file_id);
      throw error;
    }
  } catch (error) {
    console.error('[CRITICAL-ERROR] in generate-previews function:', error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});