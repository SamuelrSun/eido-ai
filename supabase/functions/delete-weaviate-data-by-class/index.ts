// supabase/functions/delete-weaviate-data-by-class/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { class_id_to_delete } = await req.json();
    if (!class_id_to_delete) throw new Error("class_id_to_delete is required.");

    const weaviateHost = Deno.env.get("WEAVIATE_URL");
    const weaviateApiKey = Deno.env.get("WEAVIATE_API_KEY");
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!weaviateHost || !weaviateApiKey || !openAIApiKey) throw new Error('Weaviate/OpenAI secrets not configured.');

    const weaviateClient: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: weaviateHost,
      apiKey: new ApiKey(weaviateApiKey),
      headers: { 'X-OpenAI-Api-Key': openAIApiKey },
    });
    
    console.log(`[Weaviate Cleanup] Deleting objects for user ${user.id} and class ${class_id_to_delete}`);

    const deleteResponse = await weaviateClient.batch
      .deleter()
      .withClassName('DocumentChunk')
      .withWhere({
        operator: 'And',
        operands: [
          { path: ['user_id'], operator: 'Equal', valueText: user.id },
          { path: ['class_db_id'], operator: 'Equal', valueText: class_id_to_delete },
        ],
      })
      .do();
    
    console.log(`[Weaviate Cleanup] Deletion response:`, deleteResponse);

    return new Response(
      JSON.stringify({ success: true, message: `Successfully cleared ${deleteResponse.results?.successful || 0} items for the class.` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in delete-weaviate-data-by-class function:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});