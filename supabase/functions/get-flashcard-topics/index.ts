
// Follow this setup guide to integrate the Deno runtime into your application:
// https://docs.supabase.com/guides/functions/connect-to-database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2"
import { corsHeaders } from "../_shared/cors.ts"

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
    
    // Get metadata from embeddings to extract potential topics
    const { data: embeddingsData, error } = await supabaseClient
      .from('embeddings')
      .select('metadata')
      .limit(100)
    
    if (error) {
      throw new Error(`Error fetching embeddings metadata: ${error.message}`)
    }
    
    // Extract topics from metadata (assuming metadata contains a 'topic' field)
    const topicsSet = new Set<string>()
    
    embeddingsData?.forEach((item: any) => {
      if (item?.metadata?.topic) {
        topicsSet.add(item.metadata.topic)
      }
    })
    
    const extractedTopics = Array.from(topicsSet)
    
    // Include default topics if none are found in the embeddings
    const topics = extractedTopics.length > 0 
      ? [...extractedTopics, "All Topics"]
      : [
          "Network Security",
          "Encryption",
          "Security Protocols", 
          "Cybersecurity Basics",
          "All Topics"
        ]
    
    return new Response(
      JSON.stringify({
        topics
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
