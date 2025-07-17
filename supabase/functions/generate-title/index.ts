// supabase/functions/generate-title/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { OpenAI } from "https://deno.land/x/openai/mod.ts";
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Correctly parse the JSON body
    const { query } = await req.json();
    if (!query) {
      throw new Error("Missing 'query' in request body.");
    }

    const openai = new OpenAI(Deno.env.get("OPENAI_API_KEY")!);

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert at creating short, concise, 3-4 word titles for chat conversations based on the user\'s first message. Do not use quotes in the title. Be direct and relevant.' 
        },
        { 
          role: 'user', 
          content: `Generate a title for a conversation starting with: "${query}"` 
        },
      ],
      model: 'gpt-3.5-turbo',
      max_tokens: 20,
      temperature: 0.3,
    });

    const title = chatCompletion.choices[0].message.content?.trim().replace(/"/g, '') || "New Chat";

    return new Response(JSON.stringify({ title }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
})
