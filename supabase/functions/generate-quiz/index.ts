
// Follow this setup guide to integrate the Deno runtime into your application:
// https://docs.supabase.com/guides/functions/connect-to-database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2"
import { corsHeaders } from "../_shared/cors.ts"

// OpenAI API key from environment variable
const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

if (!openaiApiKey) {
  console.error("OPENAI_API_KEY environment variable is not set");
}

// Vector store ID and assistant ID are reused from the flashcards function
const vectorStoreId = "vs_681a9a95ea088191b7c66683f0f3b9cf";
const assistantId = "asst_u7TVc67jaF4bb2qsUzasOWSs";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface GenerateQuizParams {
  title: string;
  questionCount: number;
  difficulty: string;
  coverage: string;
}

serve(async (req) => {
  console.log("Function invoked: generate-quiz");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check if OpenAI API key is available
    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured. Please add it to your Supabase secrets.");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )
    
    const { title, questionCount, difficulty, coverage }: GenerateQuizParams = await req.json()
    console.log(`Generating ${questionCount} ${difficulty} quiz questions for: ${title} covering ${coverage}`);
    
    // Generate quiz content using a simpler approach - without using Assistants API
    // This is more reliable for our current needs
    
    // Query the content from the embeddings table
    const { data: embeddingData, error: embeddingError } = await supabaseClient
      .from('embeddings')
      .select('content')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (embeddingError) {
      console.error("Error fetching embeddings:", embeddingError);
      throw new Error(`Failed to fetch embeddings: ${embeddingError.message}`);
    }
    
    // Extract topics from the available embeddings
    const availableContent = embeddingData?.map(e => e.content).join(' ').substring(0, 2000) || '';
    
    console.log("Available content sample:", availableContent.substring(0, 100) + "...");

    // Use the Chat Completions API directly instead of Assistants API
    console.log("Calling OpenAI Chat Completions API");
    
    const systemPrompt = `You are a quiz generator that creates educational multiple-choice questions.
    Use the following content as your knowledge base to create ${questionCount} quiz questions about "${title}":
    
    ${availableContent}
    
    Generate exactly ${questionCount} quiz questions with the following specifications:
    - Difficulty level: ${difficulty}
    - Content coverage: ${coverage}
    - Each question must have exactly 4 options (labeled as options in an array)
    - Only one option should be correct (indicated by correctAnswerIndex - a number from 0 to 3)
    - Include a brief explanation of why the correct answer is right
    - Make all options plausible and similar in length and style
    - Don't make incorrect options obviously wrong
    
    Format your response as a valid JSON object with this exact structure:
    {
      "questions": [
        {
          "question": "Question text here?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswerIndex": 0,
          "explanation": "Explanation of why Option A is correct"
        },
        // more questions...
      ]
    }`;
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            "role": "system",
            "content": systemPrompt
          }
        ],
        temperature: 0.5,
        max_tokens: 4000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API returned error: ${response.status} ${response.statusText}`);
    }
    
    const openAIResponse = await response.json();
    console.log("Received response from OpenAI");
    
    // Parse the response to extract the questions
    let quizContent;
    try {
      const responseText = openAIResponse.choices[0].message.content;
      console.log("Response text sample:", responseText.substring(0, 200) + "...");
      
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // Clean the JSON string
        let jsonStr = jsonMatch[0];
        jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');
        
        quizContent = JSON.parse(jsonStr);
      } else {
        // If no JSON object found, try to parse the whole text
        quizContent = JSON.parse(responseText);
      }
    } catch (e) {
      console.error("Failed to parse JSON from response:", e);
      throw new Error("Failed to parse quiz questions from OpenAI response");
    }
    
    // Validate the parsed content
    if (!quizContent || !quizContent.questions || !Array.isArray(quizContent.questions) || quizContent.questions.length === 0) {
      console.error("Invalid quiz content structure:", JSON.stringify(quizContent));
      throw new Error("Generated quiz content has invalid structure");
    }
    
    // Calculate average time per question based on difficulty
    let timeEstimateMinutes = 0;
    switch(difficulty.toLowerCase()) {
      case 'easy':
        timeEstimateMinutes = questionCount * 0.5; // 30 seconds per question
        break;
      case 'medium':
        timeEstimateMinutes = questionCount * 1; // 1 minute per question
        break;
      case 'hard':
        timeEstimateMinutes = questionCount * 1.5; // 1.5 minutes per question
        break;
      default:
        timeEstimateMinutes = questionCount * 1; // Default to 1 minute per question
    }
    
    // Return the generated quiz questions
    return new Response(
      JSON.stringify({
        questions: quizContent.questions,
        timeEstimate: Math.ceil(timeEstimateMinutes),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unknown error occurred while generating quiz questions'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
