// supabase/functions/check-env-vars/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from "../_shared/cors.ts";

serve(async (_req) => {
  // This function checks environment variables and connectivity to Weaviate.
  console.log("Running diagnostic check...");

  try {
    const weaviateHost = Deno.env.get("WEAVIATE_URL");
    const weaviateApiKey = Deno.env.get("WEAVIATE_API_KEY");
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

    const secretsReport = {
      WEAVIATE_URL_SET: !!weaviateHost,
      WEAVIATE_API_KEY_SET: !!weaviateApiKey,
      OPENAI_API_KEY_SET: !!openAIApiKey,
    };

    let connectionReport = {
      weaviateConnectionSuccessful: false,
      error: "Not attempted due to missing secrets.",
    };

    // Only attempt to connect if the required secrets are present.
    if (weaviateHost && weaviateApiKey && openAIApiKey) {
      try {
        const weaviateClient: WeaviateClient = weaviate.client({
          scheme: 'https',
          host: weaviateHost,
          apiKey: new ApiKey(weaviateApiKey),
          headers: { 'X-OpenAI-Api-Key': openAIApiKey },
        });

        // The .misc.liveChecker() is a built-in way to check if the Weaviate instance is running.
        const isLive = await weaviateClient.misc.liveChecker();
        if (isLive) {
          connectionReport = {
            weaviateConnectionSuccessful: true,
            error: "null",
          };
          console.log("Diagnostic check: Successfully connected to Weaviate.");
        } else {
           throw new Error("liveChecker returned false. Instance may be unhealthy.");
        }
      } catch (e) {
        console.error("Diagnostic check: Weaviate connection failed.", e);
        connectionReport = {
          weaviateConnectionSuccessful: false,
          error: e.message,
        };
      }
    }

    const allGood = Object.values(secretsReport).every(Boolean) && connectionReport.weaviateConnectionSuccessful;

    return new Response(
      JSON.stringify({
        success: true,
        message: allGood ? "All checks passed." : "One or more checks failed.",
        report: {
          secrets: secretsReport,
          connectivity: connectionReport,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Critical error in check-env-vars function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
