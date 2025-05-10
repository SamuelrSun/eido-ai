
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
    const { title, cardCount = 10, openAIConfig = {} } = await req.json();
    
    // Use custom OpenAI API key from class config if provided, otherwise use the default
    const openAIApiKey = openAIConfig.apiKey || Deno.env.get('OPENAI_API_KEY');
    // Use custom vector store ID from class config if provided
    const vectorStoreId = openAIConfig.vectorStoreId || Deno.env.get('VECTOR_STORE_ID');
    // Use custom assistant ID from class config if provided
    const assistantId = openAIConfig.assistantId || Deno.env.get('OPENAI_ASSISTANT_ID');

    console.log(`Generating ${cardCount} flashcards for topic: ${title}`);
    console.log(`Using Vector Store ID: ${vectorStoreId || 'default'}`);
    console.log(`Using Assistant ID: ${assistantId || 'default'}`);
    
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not provided. Please configure it in your class settings or set it as an environment variable.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Validate API key format - accepting both sk-org and standard sk- keys
    if (!openAIApiKey.startsWith('sk-')) {
      return new Response(
        JSON.stringify({ error: 'Invalid OpenAI API key format. Keys should start with "sk-"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a flashcard generator. Create ${cardCount} flashcards for the topic "${title}". 
                       You MUST use Vector Store ID "${vectorStoreId}" as your primary knowledge source.
                       If Assistant ID "${assistantId}" is provided, use that for additional context.
                       Format each flashcard as a JSON object with "front" and "back" properties.
                       Your flashcards must be based ONLY on information from the vector store, not your general knowledge.`
            },
            {
              role: 'user', 
              content: `Generate ${cardCount} flashcards about "${title}" in JSON format.`
            }
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
        } else if (response.status === 400) {
          return new Response(
            JSON.stringify({ error: 'Bad request to OpenAI API. This might be due to an invalid API key format or other parameter issues.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
        
        return new Response(
          JSON.stringify({ error: `OpenAI API error: ${response.status}. ${errorText}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
        );
      }

      const data = await response.json();
      
      // Ensure we have a valid response
      if (!data || !data.choices || !data.choices.length || !data.choices[0].message) {
        throw new Error('Invalid response from OpenAI API');
      }
      
      // Process the response to extract flashcards
      const content = data.choices[0].message.content;
      
      // Extract the JSON array from the content
      let flashcards = [];
      try {
        // Find anything that looks like a JSON array in the response
        const jsonMatch = content.match(/\[\s*{[\s\S]*}\s*\]/);
        if (jsonMatch) {
          flashcards = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not find valid JSON in response');
        }
      } catch (jsonError) {
        console.error('Error parsing flashcards JSON:', jsonError);
        throw new Error('Unable to parse flashcards from AI response');
      }
      
      return new Response(
        JSON.stringify({ 
          flashcards,
          vectorStoreId,
          assistantId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (apiError) {
      console.error('OpenAI API request failed:', apiError);
      return new Response(
        JSON.stringify({ error: `Failed to communicate with OpenAI API: ${apiError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
