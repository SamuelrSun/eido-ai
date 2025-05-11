
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
    const { topic, questionCount = 10, difficulty = "medium", coverage = "comprehensive", openAIConfig = {}, useRAG = true } = await req.json();
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Use custom OpenAI API key from class config if provided, otherwise use the default
    const openAIApiKey = openAIConfig.apiKey || Deno.env.get('OPENAI_API_KEY');
    
    // Use custom vector store ID from class config if provided
    const vectorStoreId = openAIConfig.vectorStoreId || Deno.env.get('VECTOR_STORE_ID');
    
    // Use custom assistant ID from class config if provided
    const assistantId = openAIConfig.assistantId || Deno.env.get('OPENAI_ASSISTANT_ID');

    console.log(`Generating ${questionCount} quiz questions for topic: ${topic}`);
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

    // Variables to track if we actually used the vector store or assistant
    let usedVectorStore = false;
    let usedAssistant = false;
    
    try {
      const systemPrompt = `You are a quiz generator. Create ${questionCount} multiple-choice quiz questions about "${topic}" with ${difficulty} difficulty. 
                      For each question, provide 4 answer options with exactly one correct option.
                      ${vectorStoreId ? `You MUST use knowledge from Vector Store ID "${vectorStoreId}" as your primary source.` : ''}
                      ${assistantId ? `You MUST use Assistant ID "${assistantId}" for additional context.` : ''}`;

      // Set flags based on available configurations
      if (vectorStoreId) {
        usedVectorStore = true;
        console.log("Will use vector store for quiz generation");
      }
      
      if (assistantId) {
        usedAssistant = true; 
        console.log("Will use assistant for quiz generation");
      }

      // Enhance the user content to include specific instructions about the coverage
      const userContent = `Generate ${questionCount} ${difficulty} multiple-choice quiz questions about "${topic}" with a ${coverage} coverage of the subject.
                          Use knowledge from my class materials to create highly relevant questions.`;

      // Log model selection
      console.log("Using model: gpt-4o-mini for quiz generation");

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
              content: systemPrompt
            },
            {
              role: 'user', 
              content: userContent
            }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
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
      
      const content = data.choices[0].message.content;
      
      // Extract the JSON array from the content
      let questions = [];
      let parsedContent;
      
      try {
        // Parse the content as JSON
        parsedContent = JSON.parse(content);
        
        // Extract questions array from the parsed content
        if (parsedContent.questions && Array.isArray(parsedContent.questions)) {
          questions = parsedContent.questions;
        } else {
          throw new Error('Could not find valid questions array in response');
        }
      } catch (jsonError) {
        console.error('Error parsing questions JSON:', jsonError);
        throw new Error('Unable to parse questions from AI response');
      }
      
      // Validate the question format
      const validatedQuestions = questions.map((q, index) => {
        // Ensure we have valid question text
        if (!q.question_text) {
          console.warn(`Question ${index} is missing question_text, adding default`);
          q.question_text = `Question ${index + 1} about ${topic}`;
        }
        
        // Ensure options are valid
        if (!Array.isArray(q.options) || q.options.length < 4) {
          console.warn(`Question ${index} has invalid options, adding defaults`);
          q.options = q.options || [];
          while (q.options.length < 4) {
            q.options.push(`Option ${q.options.length + 1}`);
          }
        }
        
        // Ensure correct_answer_index is valid
        if (typeof q.correct_answer_index !== 'number' || q.correct_answer_index < 0 || q.correct_answer_index > 3) {
          console.warn(`Question ${index} has invalid correct_answer_index, defaulting to 0`);
          q.correct_answer_index = 0;
        }
        
        // Ensure explanation exists
        if (!q.explanation) {
          q.explanation = "No explanation provided";
        }
        
        return q;
      });
      
      // Calculate a time estimate based on question count and difficulty
      const difficultyMultiplier = {
        easy: 0.8,
        medium: 1.0,
        hard: 1.2,
        expert: 1.5
      };
      
      const timeEstimate = Math.ceil(questionCount * (difficultyMultiplier[difficulty] || 1) * 0.5); // minutes
      
      return new Response(
        JSON.stringify({ 
          questions: validatedQuestions,
          timeEstimate,
          vectorStoreId,
          assistantId,
          usedVectorStore,
          usedAssistant
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
