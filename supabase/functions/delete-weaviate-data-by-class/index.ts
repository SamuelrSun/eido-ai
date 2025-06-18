// supabase/functions/delete-weaviate-data-by-class/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdminClient: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: { user } } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    ).auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { class_id_to_delete } = await req.json();
    if (!class_id_to_delete) throw new Error("class_id_to_delete is required.");

    // Step 1: Find all file_ids associated with the class to be deleted
    const { data: files, error: fileError } = await supabaseAdminClient
      .from('files')
      .select('file_id')
      .eq('class_id', class_id_to_delete)
      .eq('user_id', user.id);

    if (fileError) throw new Error(`Failed to fetch files for class deletion: ${fileError.message}`);

    const fileIdsToDelete = files.map(f => f.file_id);

    if (fileIdsToDelete.length === 0) {
      console.log(`No files found for class ${class_id_to_delete}, so no Weaviate chunks to delete.`);
      return new Response(JSON.stringify({ success: true, message: "No Weaviate data to delete for this class." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Delete chunks from Weaviate where source_file_id matches
    const weaviateHost = Deno.env.get("WEAVIATE_URL");
    const weaviateApiKey = Deno.env.get("WEAVIATE_API_KEY");
    if (!weaviateHost || !weaviateApiKey) throw new Error('Weaviate secrets not configured.');

    const weaviateClient: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: weaviateHost,
      apiKey: new ApiKey(weaviateApiKey),
    });
    
    console.log(`[Weaviate Cleanup] Deleting chunks for ${fileIdsToDelete.length} files in class ${class_id_to_delete}`);

    const deleteResponse = await weaviateClient.batch
      .objectsBatchDeleter()
      .withClassName('DocumentChunk')
      .withWhere({
        operator: 'Or',
        operands: fileIdsToDelete.map(id => ({
          path: ['source_file_id'],
          operator: 'Equal',
          valueText: id,
        })),
      })
      .do();
    
    console.log(`[Weaviate Cleanup] Deletion response:`, deleteResponse);

    return new Response(
      JSON.stringify({ success: true, message: `Successfully cleared ${deleteResponse.results?.successful || 0} items for the class.` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("--- [FATAL] Critical error in delete-weaviate-data-by-class function ---", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});