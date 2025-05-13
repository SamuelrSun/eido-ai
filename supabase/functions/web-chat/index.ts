// supabase/functions/web-chat/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts"; // Ensure this path is correct

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY environment variable not set for web-chat function.");
      throw new Error('Server configuration error: OpenAI API key is missing.');
    }

    const { message, history = [] } = await req.json();
    if (!message || typeof message !== 'string' || message.trim() === "") {
      throw new Error("User message is required and must be a non-empty string.");
    }

    console.log(`Web chat request (general knowledge) for: "${message}"`);
    
    const systemMessage = "You are a helpful AI assistant. Answer the user's questions based on your broad general knowledge, providing comprehensive and informative responses. If you don't know something, say so.";

    // Call OpenAI Chat Completions API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Or your preferred model
        messages: [
          { role: "system", content: systemMessage },
          ...history, // Pass previous conversation history
          { role: "user", content: message },
        ],
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`OpenAI API error in web-chat: ${openaiResponse.status}`, errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}. ${errorText.substring(0, 200)}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error("Invalid or empty response from OpenAI API in web-chat:", openaiData);
      throw new Error("Invalid response from OpenAI API (no content).");
    }

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in web-chat function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: errorMessage.includes("required") || errorMessage.includes("OpenAI API key") ? 400 : 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
