
// Follow this setup guide to integrate the Deno runtime into your application:
// https://docs.supabase.com/guides/functions/connect-to-database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2"
import { corsHeaders } from "../_shared/cors.ts"

const FALLBACK_TOPICS = [
  "Network Security",
  "Encryption",
  "Security Protocols", 
  "Cybersecurity Basics",
  "All Topics"
];

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Function invoked: get-flashcard-topics");
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )
    
    let topics = [];
    
    try {
      // Get metadata from embeddings to extract potential topics
      const { data: embeddingsData, error } = await supabaseClient
        .from('embeddings')
        .select('metadata')
        .limit(100)
      
      if (error) {
        console.error(`Error fetching embeddings metadata: ${error.message}`);
        throw error;
      }
      
      // Extract topics from metadata (assuming metadata contains a 'topic' field)
      const topicsSet = new Set<string>()
      
      embeddingsData?.forEach((item: any) => {
        if (item?.metadata?.topic) {
          topicsSet.add(item.metadata.topic)
        }
      })
      
      topics = Array.from(topicsSet);
    } catch (dbError) {
      console.error("Database error:", dbError);
      // Continue execution with fallback topics
    }
    
    // Include default topics if none are found in the embeddings
    if (topics.length === 0) {
      topics = FALLBACK_TOPICS;
    } else if (!topics.includes("All Topics")) {
      topics.push("All Topics");
    }
    
    console.log("Returning topics:", topics);
    
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
      JSON.stringify({ 
        topics: FALLBACK_TOPICS,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 with fallback data instead of 500
      },
    )
  }
})
