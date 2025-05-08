
// Follow this setup guide to integrate the Deno runtime into your application:
// https://docs.supabase.com/guides/functions/connect-to-database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2"
import { corsHeaders } from "../_shared/cors.ts"

const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

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
    
    // Check if OpenAI API key is available
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY is not set');
      return new Response(
        JSON.stringify({
          error: 'OpenAI API key is not configured. Please contact an administrator.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }
    
    // Get random content from the embeddings table as context
    const { data: sampleDocs, error } = await supabaseClient
      .from('embeddings')
      .select('content')
      .limit(20) // Get a larger random sample for better context
    
    if (error) {
      console.error(`Error fetching sample documents: ${error.message}`);
      throw error;
    }
    
    if (!sampleDocs || sampleDocs.length === 0) {
      throw new Error('No content found in embeddings table');
    }
    
    // Combine the content from random documents
    const matchQuery = sampleDocs
      .map((doc: any) => doc.content)
      .join('\n\n')
    
    if (!matchQuery || matchQuery.trim() === '') {
      throw new Error(`No content found from vector store`);
    }
    
    // Call OpenAI API to generate flashcards based on the random context
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
                     Generate exactly ${cardCount} flashcards using the provided content as reference. 
                     Make each flashcard concise but informative, with a clear question on the front and a comprehensive answer on the back.
                     Format your response as a JSON array containing exactly ${cardCount} flashcards.`
          },
          {
            role: 'user',
            content: `Create exactly ${cardCount} flashcards based on the following content. Each flashcard should have a 'front' with a question and a 'back' with the answer:\n\n${matchQuery}`
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error(`OpenAI API error: ${JSON.stringify(errorData)}`);
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const openaiData = await openaiResponse.json()
    const flashcardsContent = JSON.parse(openaiData.choices[0].message.content)
    
    // Validate that we got the correct number of flashcards
    if (!flashcardsContent.flashcards || flashcardsContent.flashcards.length === 0) {
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
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
