// supabase/functions/upload-file/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface FilePayload {
  storage_path: string;
  original_name: string;
  mime_type: string;
  size: number;
  class_id: string;
  folder_id: string | null;
}

serve(async (req: Request) => {
  console.log(`[QUEUE-JOB] 'upload-file' invoked.`);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await userSupabaseClient.auth.getUser();
    if (!user) throw new Error('Authentication error: User not found.');

    const filePayload: FilePayload = await req.json();
    if (!filePayload || !filePayload.storage_path || !filePayload.class_id) {
      throw new Error('Invalid request body.');
    }

    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // MODIFICATION: This function now ONLY adds the job to the queue.
    // The 'upload-to-vector-store' function (triggered by this insert) will handle creating the file record.
    const { error } = await adminSupabaseClient
      .from('processing_queue')
      .insert({
        user_id: user.id,
        class_id: filePayload.class_id,
        folder_id: filePayload.folder_id,
        storage_path: filePayload.storage_path,
        original_name: filePayload.original_name,
        mime_type: filePayload.mime_type,
        size: filePayload.size,
        status: 'pending'
      });

    if (error) {
      console.error(`[QUEUE-JOB] ❌ Failed to insert job into queue:`, error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`[QUEUE-JOB] ✅ Job successfully added for: ${filePayload.original_name}`);
    
    return new Response(JSON.stringify({ success: true, message: "File upload acknowledged and queued for processing." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 202,
    });

  } catch (error) {
    console.error('[CRITICAL-ERROR] in upload-file function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message.includes('Authentication') ? 401 : 500,
    });
  }
});