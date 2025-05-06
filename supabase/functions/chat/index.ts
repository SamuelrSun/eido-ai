
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const SUPABASE_URL = "https://dbldoxurkcpbtdswcbkc.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    // Get the token from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Create admin supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get the OpenAI API key for this user
    const { data: apiKey, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('key_value')
      .eq('user_id', user.id)
      .eq('key_name', 'openai')
      .maybeSingle();

    if (apiKeyError || !apiKey) {
      return new Response(JSON.stringify({ error: 'API key not found for user' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Get the payload from the request
    const payload = await req.json();
    const { messages, knowledgeBase } = payload;

    // Create system prompt with cybersecurity context
    const systemPrompt = knowledgeBase 
      ? `You are CyberCoach AI, an expert cybersecurity assistant that helps answer questions based on ${knowledgeBase}. Provide clear, concise answers with actionable advice. Format your responses using markdown for clarity.`
      : "You are CyberCoach AI, an expert cybersecurity assistant. Provide clear, concise answers with actionable advice about cybersecurity topics. Format your responses using markdown for clarity.";

    // Call OpenAI API with the user's key
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey.key_value}`
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

    // Get the response data
    const openAIData = await openAIResponse.json();
    
    // Return the response data
    return new Response(JSON.stringify(openAIData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
