
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    const { message, history = [], openAIConfig = {}, knowledgeBase } = await req.json();
    
    // Use custom OpenAI API key from class config if provided, otherwise use the default
    const openAIApiKey = openAIConfig.apiKey || Deno.env.get('OPENAI_API_KEY');
    // Use custom assistant ID from class config if provided
    const assistantId = openAIConfig.assistantId || Deno.env.get('OPENAI_ASSISTANT_ID');
    // Use custom vector store ID from class config if provided
    const vectorStoreId = openAIConfig.vectorStoreId || Deno.env.get('VECTOR_STORE_ID');

    console.log("Using AssistantID:", assistantId);
    console.log("Using VectorStoreID:", vectorStoreId);
    
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not provided. Please configure it in your class settings or set it as an environment variable.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate API key format (basic check)
    if (!openAIApiKey.startsWith('sk-')) {
      return new Response(
        JSON.stringify({ error: 'Invalid OpenAI API key format. Keys should start with "sk-"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create a system message that explicitly instructs the model to use the vector store
    const systemMessage = {
      role: 'system',
      content: `You are an AI Assistant for education. 
      You must use Vector Store ID "${vectorStoreId}" as your primary knowledge base.
      If using Assistant ID "${assistantId}", you should access it for additional context.
      The user is studying "${knowledgeBase}", so focus your responses on this subject.
      Always prioritize information from the vector store over your general knowledge.
      If you're unsure about information in the vector store, acknowledge this and provide your best response.`
    };

    // Make the API call with the enhanced system message
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          systemMessage,
          ...history,
          { role: 'user', content: message }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      // Provide more helpful error messages based on status code
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Authentication error: Invalid OpenAI API key. Please check your API key and try again.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      } else if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'OpenAI API rate limit exceeded. Please try again later.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      
      throw new Error(`OpenAI API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    // Ensure we have a valid response before trying to access properties
    if (!data || !data.choices || !data.choices.length || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }
    
    return new Response(
      JSON.stringify({ 
        response: data.choices[0].message.content,
        usingCustomConfig: !!openAIConfig.apiKey,
        vectorStoreId: vectorStoreId,  // Return this for debugging purposes
        assistantId: assistantId       // Return this for debugging purposes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
