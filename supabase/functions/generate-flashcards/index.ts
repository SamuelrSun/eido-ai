
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
  topic: string;
  cardCount: number;
}

serve(async (req) => {
  // Handle CORS
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
    
    const { title, topic, cardCount }: GenerateFlashcardsParams = await req.json()
    
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY is not set')
    }
    
    // Get relevant context from the embeddings table based on the topic
    let matchQuery = ''
    if (topic && topic !== 'All Topics') {
      // Use the topic to find relevant content in the embeddings
      const { data: matchData, error: matchError } = await supabaseClient.rpc('match_documents', {
        query_embedding: topic,
        match_threshold: 0.5,
        match_count: 10
      })
      
      if (matchError) {
        throw new Error(`Error matching documents: ${matchError.message}`)
      }
      
      matchQuery = matchData
        .map((doc: any) => doc.content)
        .join('\n\n')
    } else {
      // Get a sample of documents for "All Topics"
      const { data: sampleDocs, error } = await supabaseClient
        .from('embeddings')
        .select('content')
        .limit(10)
      
      if (error) {
        throw new Error(`Error fetching sample documents: ${error.message}`)
      }
      
      matchQuery = sampleDocs
        .map((doc: any) => doc.content)
        .join('\n\n')
    }
    
    // Call OpenAI API to generate flashcards based on the context
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
            content: 'You are a helpful assistant that creates educational flashcards. Generate concise, clear flashcards with a question on the front and a comprehensive answer on the back.'
          },
          {
            role: 'user',
            content: `Create ${cardCount} flashcards about ${topic} based on the following content. Each flashcard should have a 'front' with a question and a 'back' with the answer:\n\n${matchQuery}`
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`)
    }

    const openaiData = await openaiResponse.json()
    const flashcardsContent = JSON.parse(openaiData.choices[0].message.content)
    
    // Return the generated flashcards
    return new Response(
      JSON.stringify({
        flashcards: flashcardsContent.flashcards || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
