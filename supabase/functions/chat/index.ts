
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const SUPABASE_URL = "https://dbldoxurkcpbtdswcbkc.supabase.co";
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Hard-coded OpenAI API key (the one provided by the user)
const DEFAULT_OPENAI_KEY = "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";

// Vector Store ID and Assistant ID
const VECTOR_STORE_ID = "vs_681a9a95ea088191b7c66683f0f3b9cf";
const ASSISTANT_ID = "asst_u7TVc67jaF4bb2qsUzasOWSs";

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
    console.log("Chat function called");
    
    // Create admin supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    console.log("Auth header present:", authHeader ? "Yes" : "No");
    
    // Check authorization header
    if (!authHeader && req.url.includes('/secure-coach')) {
      throw new Error("Missing authorization header");
    }
    
    // Always use the default OpenAI API key
    const userApiKey = DEFAULT_OPENAI_KEY;
    
    if (!userApiKey) {
      console.error("OpenAI API key is missing");
      throw new Error("OpenAI API key is missing");
    }
    
    // Get the payload from the request
    const payload = await req.json();
    const { messages, knowledgeBase } = payload;
    
    console.log("Request payload received:", JSON.stringify({
      messageCount: messages?.length || 0,
      knowledgeBase: knowledgeBase || "none",
    }));
    
    if (!messages || !Array.isArray(messages)) {
      console.error("Invalid messages format:", messages);
      throw new Error("Messages must be provided as an array");
    }
    
    // Create system prompt with cybersecurity context
    let systemPrompt = knowledgeBase 
      ? `You are CyberCoach AI, an expert cybersecurity assistant that helps answer questions based on ${knowledgeBase}. Provide clear, concise answers with actionable advice. Format your responses using markdown for clarity. Always use the most up-to-date information from the full vector store when answering.`
      : "You are CyberCoach AI, an expert cybersecurity assistant. Provide clear, concise answers with actionable advice about cybersecurity topics. Format your responses using markdown for clarity. Always use the most up-to-date information from the full vector store when answering.";
    
    console.log("Creating thread with OpenAI Assistants API v2");
    
    // Start a thread with the Assistant (using v2)
    const threadResponse = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userApiKey}`,
        "OpenAI-Beta": "assistants=v2"
      }
    });
    
    if (!threadResponse.ok) {
      const threadError = await threadResponse.json();
      console.error("Thread creation error:", JSON.stringify(threadError));
      throw new Error(`Failed to create thread: ${JSON.stringify(threadError)}`);
    }
    
    const threadData = await threadResponse.json();
    const threadId = threadData.id;
    
    console.log(`Created thread with ID: ${threadId}`);
    
    // Get the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    if (!lastUserMessage) {
      console.error("No user message found in:", messages);
      throw new Error("No user message found");
    }
    
    console.log("Last user message:", lastUserMessage.substring(0, 50) + (lastUserMessage.length > 50 ? "..." : ""));
    
    // Add the user message to the thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userApiKey}`,
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        role: "user",
        content: lastUserMessage
      })
    });
    
    if (!messageResponse.ok) {
      const messageError = await messageResponse.json();
      console.error("Message error:", JSON.stringify(messageError));
      throw new Error(`Failed to add message: ${JSON.stringify(messageError)}`);
    }
    
    console.log("Added user message to thread");
    
    // Run the Assistant on the thread
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userApiKey}`,
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        instructions: systemPrompt,
        tools: [
          {
            type: "file_search"
          }
        ]
      })
    });
    
    if (!runResponse.ok) {
      const runError = await runResponse.json();
      console.error("Run error:", JSON.stringify(runError));
      throw new Error(`Failed to run assistant: ${JSON.stringify(runError)}`);
    }
    
    const runData = await runResponse.json();
    const runId = runData.id;
    
    console.log(`Started run with ID: ${runId}`);
    
    // Poll for run completion
    let runStatus = "queued";
    let maxAttempts = 120;  // 2 minutes timeout (120s)
    let attempts = 0;
    
    while (runStatus !== "completed" && runStatus !== "failed" && runStatus !== "expired" && attempts < maxAttempts) {
      attempts++;
      
      await new Promise(resolve => setTimeout(resolve, 1000));  // Wait 1 second between polls
      
      const runCheckResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${userApiKey}`,
          "OpenAI-Beta": "assistants=v2"
        }
      });
      
      if (!runCheckResponse.ok) {
        const checkError = await runCheckResponse.json();
        console.error("Run check error:", JSON.stringify(checkError));
        throw new Error(`Failed to check run status: ${JSON.stringify(checkError)}`);
      }
      
      const runCheckData = await runCheckResponse.json();
      runStatus = runCheckData.status;
      
      // Only log every 10 attempts to avoid too much noise
      if (attempts % 10 === 0 || runStatus !== "in_progress") {
        console.log(`Run status (attempt ${attempts}): ${runStatus}`);
      }
      
      // If run requires action (for tool calls), handle it
      if (runStatus === "requires_action") {
        console.log("Run requires action:", JSON.stringify(runCheckData.required_action));
        // Handle tool calls if needed in the future
        break;
      }
    }
    
    if (runStatus !== "completed") {
      console.error(`Run did not complete. Final status: ${runStatus} after ${attempts} attempts.`);
      throw new Error(`Run did not complete. Final status: ${runStatus}`);
    }
    
    // Get the assistant's response
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${userApiKey}`,
        "OpenAI-Beta": "assistants=v2"
      }
    });
    
    if (!messagesResponse.ok) {
      const messagesError = await messagesResponse.json();
      console.error("Messages retrieval error:", JSON.stringify(messagesError));
      throw new Error(`Failed to get messages: ${JSON.stringify(messagesError)}`);
    }
    
    const messagesData = await messagesResponse.json();
    console.log("Retrieved messages:", JSON.stringify({
      messageCount: messagesData.data?.length || 0,
      hasData: !!messagesData.data
    }));
    
    // Find the most recent assistant message
    const assistantMessages = messagesData.data?.filter(m => m.role === "assistant") || [];
    if (assistantMessages.length === 0) {
      console.error("No assistant messages found in response:", JSON.stringify(messagesData));
      throw new Error("No assistant response found");
    }
    
    const latestAssistantMessage = assistantMessages[0];
    console.log("Latest assistant message ID:", latestAssistantMessage.id);
    
    // Check if the content array exists and has items
    if (!latestAssistantMessage.content || !Array.isArray(latestAssistantMessage.content) || latestAssistantMessage.content.length === 0) {
      console.error("Invalid assistant message structure:", JSON.stringify(latestAssistantMessage));
      throw new Error("Invalid assistant message structure");
    }
    
    // Get the text value from the first content item of type "text"
    const textContent = latestAssistantMessage.content.find(c => c.type === "text");
    if (!textContent || !textContent.text || !textContent.text.value) {
      console.error("No text content found in assistant message:", JSON.stringify(latestAssistantMessage.content));
      throw new Error("No text content found in assistant message");
    }
    
    const assistantContent = textContent.text.value;
    console.log("Assistant response length:", assistantContent.length);
    
    // Format response to match what the frontend expects
    const formattedResponse = {
      choices: [
        {
          message: {
            content: assistantContent
          }
        }
      ]
    };
    
    console.log("Successfully retrieved assistant response");
    
    // Return the assistant response
    return new Response(JSON.stringify(formattedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat function:', error);
    // Return a formatted response that won't crash the frontend
    return new Response(JSON.stringify({ 
      error: error.message,
      choices: [{ 
        message: { 
          content: `Sorry, I couldn't generate a response. Error: ${error.message}` 
        } 
      }]
    }), {
      status: 200, // Return 200 to avoid triggering fetch error handler
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
