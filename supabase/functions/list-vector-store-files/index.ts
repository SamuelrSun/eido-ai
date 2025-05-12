// supabase/functions/list-vector-store-files/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts"; // Ensure this path is correct

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get OpenAI API Key from environment variables (secrets)
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY environment variable not set.");
      throw new Error('Server configuration error: OpenAI API key is missing.');
    }

    // 2. Parse request body to get vectorStoreId
    // Expecting: { vectorStoreId: string }
    // If calling via GET, you might pass it as a query parameter,
    // but for consistency with other functions, let's assume POST with JSON body.
    // If you prefer GET, this part needs to change to read URL parameters.
    let vectorStoreId: string | null = null;
    if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        vectorStoreId = body.vectorStoreId;
    } else if (req.method === "GET") {
        const url = new URL(req.url);
        vectorStoreId = url.searchParams.get("vectorStoreId");
    }


    if (!vectorStoreId || typeof vectorStoreId !== 'string') {
      throw new Error('vectorStoreId is required (either in JSON body for POST or as a query parameter "vectorStoreId" for GET).');
    }

    console.log(`Listing files for Vector Store ID: ${vectorStoreId}`);

    // 3. Call the OpenAI API to list files in the specified vector store
    // API: GET /v1/vector_stores/{vector_store_id}/files
    // Note: This endpoint supports pagination (after, before, limit, order).
    // For simplicity, this example fetches the default first page.
    // You might want to add pagination support if a vector store can have many files.
    const response = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2", // Required for Vector Stores API
      },
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse OpenAI API response as JSON:", responseText.substring(0, 200));
      throw new Error(`Failed to parse OpenAI API response. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      console.error(`OpenAI API error when listing files for Vector Store ${vectorStoreId}:`, responseData);
      const errorMessage = responseData.error?.message || `OpenAI API returned ${response.status}`;
      throw new Error(errorMessage);
    }

    console.log(`Retrieved ${responseData.data?.length || 0} files from Vector Store ID: ${vectorStoreId}`);

    // 4. Return the list of files
    return new Response(
      JSON.stringify({
        files: responseData.data || [], // The list of VectorStoreFile objects
        count: responseData.data?.length || 0,
        vectorStoreId: vectorStoreId,
        // has_more: responseData.has_more, // Include if you implement pagination
        // first_id: responseData.first_id,
        // last_id: responseData.last_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in list-vector-store-files function:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: error.message.includes("required") ? 400 : 500, // 400 for bad request, 500 for server errors
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
