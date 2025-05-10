
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Function invoked: list-vector-store-files");

    // Get API key from request if provided, otherwise use environment variable
    const requestData = await req.json().catch(() => ({}));
    const openAIApiKey = requestData.apiKey || Deno.env.get("OPENAI_API_KEY");

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ 
          error: "OpenAI API key not provided. Please check your class settings."
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    // Call the OpenAI API to list files in the vector store
    // Using the assistants endpoint which handles vector stores
    const response = await fetch(`https://api.openai.com/v1/files?purpose=assistants`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAIApiKey}`
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
