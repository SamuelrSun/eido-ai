
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
      throw new Error('OpenAI API key not provided');
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

    const data = await response.json();
    
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
