// supabase/functions/delete-weaviate-chunks-by-class/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- 1. Initialize Clients ---
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const weaviateClient: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: Deno.env.get('WEAVIATE_URL')!,
      apiKey: new ApiKey(Deno.env.get('WEAVIATE_API_KEY')!),
    });

    // --- 2. Authenticate the User ---
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated.');
    }

    // --- 3. Validate Input ---
    const { class_id_to_delete } = await req.json();
    if (!class_id_to_delete) {
      throw new Error("Missing 'class_id_to_delete' in request body.");
    }
    
    // --- 4. CRITICAL: Verify Ownership ---
    // Ensure the user calling this function is the owner of the class.
    const { data: classData, error: ownerError } = await adminSupabase
      .from('classes')
      .select('owner_id')
      .eq('class_id', class_id_to_delete)
      .single();

    if (ownerError || !classData) {
      throw new Error('Class not found.');
    }

    if (classData.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Permission denied: You are not the owner of this class.' }), {
        status: 403, // Forbidden
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- 5. Perform Deletion from Weaviate ---
    console.log(`[WEAVIATE-DELETE] Deleting all chunks for class_id: ${class_id_to_delete}`);
    const result = await weaviateClient.batch.objectsBatchDeleter()
      .withClassName('DocumentChunk')
      .withWhere({
        operator: 'Equal',
        path: ['class_id'],
        valueText: class_id_to_delete,
      })
      .do();
    
    const errors = result.results?.objects?.filter(obj => obj.errors) ?? [];
    if (errors.length > 0) {
        console.error('Weaviate deletion encountered errors:', JSON.stringify(errors, null, 2));
        // Proceeding, but logging the error. The class deletion should continue.
    }

    const deletedCount = result.results?.matches || 0;
    console.log(`[WEAVIATE-DELETE] Successfully deleted ${deletedCount} chunks.`);

    return new Response(JSON.stringify({ success: true, deletedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[DELETE-WEAVIATE-CHUNKS-BY-CLASS ERROR]:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});