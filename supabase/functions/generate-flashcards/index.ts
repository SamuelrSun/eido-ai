
// Follow this setup guide to integrate the Deno runtime into your application:
// https://docs.supabase.com/guides/functions/connect-to-database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2"
import { corsHeaders } from "../_shared/cors.ts"

// Set the API key directly (you can update this later through Supabase Secrets)
const openaiApiKey = "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";

// Vector store ID and assistant ID
const vectorStoreId = "vs_681a9a95ea088191b7c66683f0f3b9cf";
const assistantId = "asst_u7TVc67jaF4bb2qsUzasOWSs";

interface FlashcardContent {
  front: string;
  back: string;
}

interface GenerateFlashcardsParams {
  title: string;
  cardCount: number;
}

serve(async (req) => {
  console.log("Function invoked: generate-flashcards");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )
    
    const { title, cardCount }: GenerateFlashcardsParams = await req.json()
    console.log(`Generating ${cardCount} flashcards for deck: ${title}`);
    
    // Create a proper prompt that focuses on the title subject
    const prompt = `Create ${cardCount} educational flashcards about "${title}". 
    Each flashcard should have a clear question on the front and a comprehensive answer on the back.
    The flashcards should cover key concepts, definitions, and important facts about ${title}.
    Make the content accurate, educational, and helpful for someone studying this topic.
    Format the response as a JSON array with 'front' and 'back' properties for each card.`;
    
    console.log("Sending prompt to OpenAI:", prompt.substring(0, 100) + "...");
    
    // Call OpenAI API to generate flashcards based on the prompt
    console.log("Calling OpenAI API to generate flashcards...");
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that creates educational flashcards. 
                     Generate exactly ${cardCount} flashcards about "${title}". 
                     Make each flashcard concise but informative, with a clear question on the front and a comprehensive answer on the back.
                     Format your response as a JSON object with a "flashcards" array containing exactly ${cardCount} flashcard objects.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    console.log("OpenAI API response status:", openaiResponse.status);
    
    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error(`OpenAI API error: ${errorData}`);
      throw new Error(`OpenAI API error: ${errorData}`);
    }

    const openaiData = await openaiResponse.json();
    console.log("OpenAI response received successfully");
    
    // Parse the JSON response from OpenAI
    let flashcardsContent;
    try {
      flashcardsContent = JSON.parse(openaiData.choices[0].message.content);
    } catch (e) {
      console.error("Failed to parse OpenAI response:", e);
      console.log("Raw response:", openaiData.choices[0].message.content.substring(0, 500));
      throw new Error("Failed to parse flashcards response from OpenAI");
    }
    
    // Validate that we got the correct number of flashcards
    if (!flashcardsContent.flashcards || flashcardsContent.flashcards.length === 0) {
      console.error("No flashcards were found in the response");
      console.log("Raw response:", openaiData.choices[0].message.content.substring(0, 500));
      throw new Error('No flashcards were generated in the response');
    }
    
    if (flashcardsContent.flashcards.length < cardCount) {
      console.warn(`Requested ${cardCount} flashcards but only got ${flashcardsContent.flashcards.length}`);
    }
    
    // Return the generated flashcards
    return new Response(
      JSON.stringify({
        flashcards: flashcardsContent.flashcards,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error generating flashcards:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unknown error occurred while generating flashcards'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
