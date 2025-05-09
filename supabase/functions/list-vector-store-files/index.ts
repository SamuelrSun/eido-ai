
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

// OpenAI API Key is set directly for development
// In production, store this securely in Supabase secrets
const openaiApiKey = "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";

// The vector store ID to retrieve files from
const vectorStoreId = "vs_681a9a95ea088191b7c66683f0f3b9cf";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Function invoked: list-vector-store-files");
    
    // Call the OpenAI API to list files in the vector store
    const response = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
        "OpenAI-Beta": "assistants=v2"
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      
      let errorMessage = `OpenAI API returned ${response.status}`;
      try {
        const parsedError = JSON.parse(errorData);
        errorMessage = parsedError.error?.message || errorMessage;
      } catch (e) {
        // If parsing fails, use the raw error text (but limit length)
        errorMessage = errorData.length > 200 ? 
          `${errorData.substring(0, 200)}...` : errorData;
      }
      
      throw new Error(errorMessage);
    }
    
    // Parse the successful response
    const filesData = await response.json();
      
    console.log("Retrieved files from vector store:", JSON.stringify({
      fileCount: filesData.data?.length || 0,
      hasData: !!filesData.data
    }));

    // Return the list of files
    return new Response(
      JSON.stringify({
        files: filesData.data || [],
        count: filesData.data?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error listing vector store files:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unknown error occurred while listing vector store files'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
