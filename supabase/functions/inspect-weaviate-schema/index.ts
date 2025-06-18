// supabase/functions/inspect-weaviate-schema/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from "../_shared/cors.ts";

serve(async (_req) => {
  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("--- [INSPECT] Function invoked. ---");

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

    console.log("--- [INSPECT] Weaviate client initialized. Fetching schema for 'DocumentChunk'... ---");

    const schema = await weaviateClient.schema.classGetter().withClassName("DocumentChunk").do();

    console.log("--- [INSPECT] Successfully retrieved schema. ---");

    return new Response(
      JSON.stringify(schema, null, 2), // Pretty-print the JSON response
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("--- [INSPECT] Error fetching Weaviate schema:", errorMessage);
    
    if (errorMessage.includes("404")) {
       return new Response(
        JSON.stringify({ success: false, error: "Schema 'DocumentChunk' does not exist. This is good, it means the reset worked. Please re-upload a file to recreate it." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});