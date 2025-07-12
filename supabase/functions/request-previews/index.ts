// supabase/functions/request-previews/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // This function can be called by another function, so we use the service role key
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { file_id } = await req.json();
    if (!file_id) throw new Error("Missing 'file_id' in request body.");

    console.log(`[REQUEST-PREVIEWS] Received request to generate previews for file_id: ${file_id}`);

    const { error } = await adminSupabaseClient
      .from('preview_queue')
      .insert({ file_id: file_id, status: 'pending' });

    if (error) throw error;

    console.log(`[REQUEST-PREVIEWS] ✅ Successfully queued preview generation for file_id: ${file_id}`);

    return new Response(JSON.stringify({ success: true, message: "Preview generation job has been queued." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 202,
    });

  } catch (error) {
    console.error('[CRITICAL-ERROR] in request-previews function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});