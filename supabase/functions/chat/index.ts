
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const SUPABASE_URL = "https://dbldoxurkcpbtdswcbkc.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Hard-coded OpenAI API key (the one provided by the user)
const DEFAULT_OPENAI_KEY = "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";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Always use the default OpenAI key
    const userApiKey = DEFAULT_OPENAI_KEY;
    
    // Get the payload from the request
    const payload = await req.json();
    const { messages, knowledgeBase } = payload;

    // Create system prompt with cybersecurity context
    const systemPrompt = knowledgeBase 
      ? `You are CyberCoach AI, an expert cybersecurity assistant that helps answer questions based on ${knowledgeBase}. Provide clear, concise answers with actionable advice. Format your responses using markdown for clarity.`
      : "You are CyberCoach AI, an expert cybersecurity assistant. Provide clear, concise answers with actionable advice about cybersecurity topics. Format your responses using markdown for clarity.";

    // Call OpenAI API with the default key
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
      })
    });

    // Check if the response is OK
    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      // Format error response for frontend
      return new Response(JSON.stringify({ 
        error: errorData.error.message || "Error from OpenAI API",
        // Include a mock choice so frontend doesn't crash
        choices: [{ 
          message: { 
            content: `Error: ${errorData.error.message || "Failed to get response from AI"}` 
          } 
        }]
      }), {
        status: 200, // Return 200 to avoid triggering fetch error, but with error data
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get the response data
    const openAIData = await openAIResponse.json();
    
    // Return the response data
    return new Response(JSON.stringify(openAIData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    // Return a formatted response that won't crash the frontend
    return new Response(JSON.stringify({ 
      error: error.message,
      choices: [{ 
        message: { 
          content: `Error: ${error.message}` 
        } 
      }]
    }), {
      status: 200, // Return 200 to avoid triggering fetch error handler
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
