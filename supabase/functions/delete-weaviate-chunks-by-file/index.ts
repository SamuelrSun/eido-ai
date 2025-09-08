// supabase/functions/delete-weaviate-chunks-by-file/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { file_id } = await req.json();
    if (!file_id) {
      throw new Error("Missing 'file_id' in request body.");
    }

    // --- FIX: ADD OWNERSHIP VERIFICATION ---
    // 1. Initialize Supabase admin client to check ownership.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 2. Get the authenticated user making the request.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // 3. Fetch the file's owner from the database.
    const { data: file, error: fileError } = await supabaseAdmin
      .from('files')
      .select('user_id')
      .eq('file_id', file_id)
      .single();

    if (fileError || !file) {
      throw new Error('File not found.');
    }

    // 4. Compare the requesting user's ID with the file's owner ID.
    if (file.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Permission denied: You do not own this file.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // --- END FIX ---

    const client: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: Deno.env.get('WEAVIATE_URL')!,
      apiKey: new ApiKey(Deno.env.get('WEAVIATE_API_KEY')!),
    });

    const result = await client.batch.objectsBatchDeleter({
      className: 'DocumentChunk',
      where: {
        operator: 'Equal',
        path: ['source_file_id'],
        valueText: file_id,
      },
    });

    const errors = result.results?.objects?.filter(obj => obj.errors) ?? [];
    if (errors.length > 0) {
        console.error('Weaviate deletion errors:', JSON.stringify(errors, null, 2));
        throw new Error(`Failed to delete some chunks for file_id: ${file_id}`);
    }

    return new Response(JSON.stringify({ success: true, deletedCount: result.results?.matches }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[DELETE-WEAVIATE-CHUNKS ERROR]:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});