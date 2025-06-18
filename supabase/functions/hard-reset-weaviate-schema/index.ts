// supabase/functions/hard-reset-weaviate-schema/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from "../_shared/cors.ts";

serve(async (_req) => {
  console.log("--- [HARD RESET] Function invoked. Attempting to delete Weaviate class... ---");
  try {
    const weaviateHost = Deno.env.get("WEAVIATE_URL");
    const weaviateApiKey = Deno.env.get("WEAVIATE_API_KEY");
    if (!weaviateHost || !weaviateApiKey) {
      throw new Error('Weaviate secrets are not configured.');
    }

    const weaviateClient: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: weaviateHost,
      apiKey: new ApiKey(weaviateApiKey),
    });

    const className = "DocumentChunk";
    
    // Check if the class exists before trying to delete
    try {
      await weaviateClient.schema.classGetter().withClassName(className).do();
      console.log(`--- [HARD RESET] Found class "${className}". Proceeding with deletion. ---`);
      // MODIFIED: Corrected variable name from 'client' to 'weaviateClient'
      await weaviateClient.schema.classDeleter().withClassName(className).do();
      console.log(`--- [HARD RESET] Successfully deleted class "${className}". ---`);
    } catch (e) {
      // If classGetter() throws, it means the class doesn't exist, which is also a success state for our purpose.
      console.log(`--- [HARD RESET] Class "${className}" does not exist. No action needed. ---`);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Schema for "${className}" has been cleared.` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("--- [HARD RESET] Critical error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});