// supabase/functions/delete-weaviate-chunks-by-file/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  console.log("--- [INFO] delete-weaviate-chunks-by-file function invoked ---");

  try {
    // 1. Authenticate user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    console.log(`--- [INFO] Authenticated user: ${user.id} ---`);

    // 2. Get file ID from request body
    const { file_id } = await req.json();
    if (!file_id) throw new Error("file_id is required in the request body.");
    console.log(`--- [INFO] Received request to delete chunks for file_id: ${file_id} ---`);

    // 3. Initialize Weaviate client
    const weaviateHost = Deno.env.get("WEAVIATE_URL");
    const weaviateApiKey = Deno.env.get("WEAVIATE_API_KEY");
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!weaviateHost || !weaviateApiKey || !openAIApiKey) {
        throw new Error('Weaviate/OpenAI secrets are not properly configured.');
    }
    console.log(`--- [INFO] Weaviate/OpenAI secrets loaded. ---`);

    const weaviateClient: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: weaviateHost,
      apiKey: new ApiKey(weaviateApiKey),
      headers: { 'X-OpenAI-Api-Key': openAIApiKey },
    });
    console.log(`--- [INFO] Weaviate client initialized. ---`);
    
    // 4. Define the deletion query
    const className = 'DocumentChunk'; // Ensure this matches your Weaviate schema
    const whereFilter = {
        operator: 'And',
        operands: [
          { path: ['user_id'], operator: 'Equal', valueText: user.id },
          { path: ['source_file_id'], operator: 'Equal', valueText: file_id },
        ],
    };

    console.log(`--- [INFO] Executing Weaviate batch delete for class '${className}' with filter:`, JSON.stringify(whereFilter));
    
    // 5. Perform the deletion using the correct method
    // FIX: Changed .deleter() to .objectsBatchDeleter()
    const deleteResponse = await weaviateClient.batch
      .objectsBatchDeleter()
      .withClassName(className)
      .withWhere(whereFilter)
      .do();

    console.log(`--- [INFO] Weaviate batch delete response received:`, JSON.stringify(deleteResponse, null, 2));

    // 6. Check the response for errors
    let hasErrors = false;
    let successfulCount = 0;
    let failedCount = 0;
    
    if (deleteResponse.results?.objects) {
        deleteResponse.results.objects.forEach(obj => {
            if (obj.result?.errors) {
                hasErrors = true;
                failedCount++;
                console.error(`--- [ERROR] Failed to delete an object:`, obj.result.errors);
            } else {
                successfulCount++;
            }
        });
    }

    if (hasErrors) {
        throw new Error(`Weaviate deletion partially failed. ${failedCount} chunk(s) could not be deleted.`);
    }

    successfulCount = deleteResponse.results?.matches || successfulCount;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully initiated deletion of ${successfulCount} chunk(s) for the file.` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("--- [FATAL] Critical error in delete-weaviate-chunks-by-file function: ---", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});