// supabase/functions/serve-file/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  // This function handles preflight requests for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Get the file_id from the request URL (e.g., /serve-file?id=...)
    const url = new URL(req.url);
    const fileId = url.searchParams.get('id');
    if (!fileId) {
      throw new Error('File ID is required.');
    }

    // 2. Fetch the file's metadata from the 'files' table to get its storage path and MIME type
    const { data: fileMeta, error: metaError } = await adminSupabase
      .from('files')
      .select('url, type, name')
      .eq('file_id', fileId)
      .single();

    if (metaError || !fileMeta || !fileMeta.url) {
      throw new Error(`File not found or has no URL: ${metaError?.message || 'Unknown error'}`);
    }

    // 3. Extract the storage path from the full public URL
    const storagePath = new URL(fileMeta.url).pathname.split('/public/file_storage/')[1];
    if (!storagePath) {
        throw new Error("Could not parse storage path from file URL.");
    }

    // 4. Download the file from Supabase Storage
    const { data: fileBlob, error: downloadError } = await adminSupabase.storage
      .from('file_storage')
      .download(storagePath);

    if (downloadError) {
      throw new Error(`Failed to download file from storage: ${downloadError.message}`);
    }

    // 5. Return the file content directly to the user
    const headers = {
      ...corsHeaders,
      'Content-Type': fileMeta.type || 'application/octet-stream',
      // This header suggests a filename to the browser if the user decides to save it
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileMeta.name)}"`,
    };

    return new Response(fileBlob, { headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});