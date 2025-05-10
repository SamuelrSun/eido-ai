
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
    const { topic, questionCount = 5, difficulty = 'medium', openAIConfig = {} } = await req.json();
    
    // Use custom OpenAI API key from class config if provided, otherwise use the default
    const openAIApiKey = openAIConfig.apiKey || Deno.env.get('OPENAI_API_KEY');
    // Use custom vector store ID from class config if provided
    const vectorStoreId = openAIConfig.vectorStoreId || Deno.env.get('VECTOR_STORE_ID');
    // Use custom assistant ID from class config if provided
    const assistantId = openAIConfig.assistantId || Deno.env.get('OPENAI_ASSISTANT_ID');

    console.log(`Generating ${questionCount} ${difficulty} quiz questions for topic: ${topic}`);
    console.log(`Using Vector Store ID: ${vectorStoreId || 'default'}`);
    console.log(`Using Assistant ID: ${assistantId || 'default'}`);
    
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not provided');
    }

    // Determine time estimate based on question count and difficulty
    const baseTime = 15; // base time in seconds
    const difficultyMultiplier = difficulty === 'easy' ? 0.8 : difficulty === 'hard' ? 1.5 : 1;
    const timeEstimate = Math.round(baseTime * questionCount * difficultyMultiplier);

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
            content: `You are a quiz generator. Create ${questionCount} multiple-choice questions of ${difficulty} difficulty for the topic "${topic}".
                      You MUST use Vector Store ID "${vectorStoreId}" as your primary knowledge source.
                      If Assistant ID "${assistantId}" is provided, use that for additional context.
                      Format each question as a JSON object with "question_text", "options" (array of 4 choices), "correct_answer_index" (0-3), and "explanation" properties.
                      Your questions must be based ONLY on information from the vector store, not your general knowledge.`
          },
          {
            role: 'user', 
            content: `Generate ${questionCount} ${difficulty} quiz questions about "${topic}" in JSON format.`
          }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    // Process the response to extract questions
    const content = data.choices[0].message.content;
    
    // Extract the JSON array from the content
    let questions = [];
    try {
      // Find anything that looks like a JSON array in the response
      const jsonMatch = content.match(/\[\s*{[\s\S]*}\s*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not find valid JSON in response');
      }
    } catch (jsonError) {
      console.error('Error parsing questions JSON:', jsonError);
      throw new Error('Unable to parse questions from AI response');
    }
    
    return new Response(
      JSON.stringify({ 
        questions, 
        timeEstimate,
        vectorStoreId,
        assistantId
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
