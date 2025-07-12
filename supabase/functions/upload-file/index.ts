// supabase/functions/upload-file/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// This interface matches what the frontend will send for each file.
interface FilePayload {
  storage_path: string;
  original_name: string;
  mime_type: string;
  size: number;
  class_id: string;
  folder_id: string | null;
}

serve(async (req: Request) => {
  console.log(`[START] 'upload-file' invoked with method: ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the user
    console.log(`[AUTH] Checking user authentication...`);
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await userSupabaseClient.auth.getUser();
    if (!user) throw new Error('Authentication error: User not found.');
    console.log(`[AUTH] ✅ User authenticated: ${user.id}`);

    // 2. Get the file payload from the request
    const filePayload: FilePayload = await req.json();
    if (!filePayload || !filePayload.storage_path || !filePayload.class_id) {
      throw new Error('Invalid request body. Missing required file payload information.');
    }

    // 3. Create an admin client to insert into the queue
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // 4. Insert a new job into the processing_queue table
    console.log(`[QUEUE] Adding job for file: ${filePayload.original_name}`);
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
        status: 'pending' // Initial status
      });

    if (error) {
      console.error(`[QUEUE] ❌ Failed to insert job into queue:`, error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`[QUEUE] ✅ Job successfully added to queue for file: ${filePayload.original_name}`);
    
    // 5. Return immediate success to the user
    return new Response(JSON.stringify({ success: true, message: "File upload acknowledged. Processing has started." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 202, // 202 Accepted: The request has been accepted for processing, but the processing has not been completed.
    });

  } catch (error) {
    console.error('[CRITICAL-ERROR] in upload-file function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message.includes('Authentication') ? 401 : 500,
    });
  }
});