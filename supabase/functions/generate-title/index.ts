import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { OpenAI } from "https://deno.land/x/openai/mod.ts";

// Define the CORS headers that our function will use
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // Allow any origin
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // This is for the browser's preflight "permission slip" request
  if (req.method === 'OPTIONS') {
    console.log("--- [INFO] Handled OPTIONS preflight request ---");
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    console.log("--- [1] generate-title function invoked (POST) ---");

    console.log("--- [2] Checking for API Key ---");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("--- [ERROR] Missing OPENAI_API_KEY secret. ---");
      throw new Error("Missing OPENAI_API_KEY secret.");
    }
    console.log("--- [3] API Key found. Parsing request body. ---");

    const { query } = await req.json();
    if (!query) {
      console.error("--- [ERROR] Missing query in request body. ---");
      return new Response(JSON.stringify({ error: 'Missing query in request body' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    console.log("--- [4] Request body parsed. Initializing OpenAI client. ---");

    const openai = new OpenAI(OPENAI_API_KEY);

    console.log("--- [5] Calling OpenAI API... ---");
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
    console.log("--- [6] OpenAI API call successful. ---");

    const title = chatCompletion.choices[0].message.content?.trim() || "New Chat";

    // Return the successful response with CORS headers
    return new Response(JSON.stringify({ title }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("--- [7] CAUGHT ERROR BLOCK ---");
    console.error(error.message);
    // Return the error response with CORS headers
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
})