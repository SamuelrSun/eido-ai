
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

// OpenAI API Key is set directly for development
// In production, store this securely in Supabase secrets
const openaiApiKey = "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";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Function invoked: list-vector-store-files");
    
    // Call the OpenAI API to list files in the vector store
    // Using the assistants endpoint which handles vector stores
    const response = await fetch(`https://api.openai.com/v1/files?purpose=assistants`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      }
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      // Try to parse the response as JSON
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse OpenAI API response as JSON:", responseText.substring(0, 200));
      
      // Return a structured error with the response text details
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse OpenAI API response",
          responseStatus: response.status,
          responseDetails: responseText.substring(0, 500)  // Include part of the response for debugging
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
    
    if (!response.ok) {
      console.error("OpenAI API error:", responseData);
      
      let errorMessage = `OpenAI API returned ${response.status}`;
      if (responseData.error?.message) {
        errorMessage = responseData.error.message;
      }
      
      throw new Error(errorMessage);
    }
      
    console.log("Retrieved files from OpenAI:", JSON.stringify({
      fileCount: responseData.data?.length || 0,
      hasData: !!responseData.data
    }));

    // Return the list of files
    return new Response(
      JSON.stringify({
        files: responseData.data || [],
        count: responseData.data?.length || 0,
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
