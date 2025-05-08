
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
    console.log(`Generating ${cardCount} flashcards for deck: ${title} using Assistant API`);
    
    // Create a proper prompt that focuses on the title subject
    const prompt = `Create ${cardCount} educational flashcards about "${title}". 
    Each flashcard should have a clear question on the front and a comprehensive answer on the back.
    The flashcards should cover key concepts, definitions, and important facts about ${title}.
    Format your response as a valid JSON object with a "flashcards" array containing exactly ${cardCount} flashcard objects.
    Each flashcard object should have "front" and "back" properties.
    Remember to only use knowledge that's available in the linked vector store.`;
    
    console.log("Creating thread with OpenAI Assistants API");
    
    // Start a thread with the Assistant (using v2)
    const threadResponse = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
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
    
    // Add the user message to the thread
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        role: "user",
        content: prompt
      })
    });
    
    if (!messageResponse.ok) {
      const messageError = await messageResponse.json();
      console.error("Message error:", JSON.stringify(messageError));
      throw new Error(`Failed to add message: ${JSON.stringify(messageError)}`);
    }
    
    console.log("Added user message to thread");
    
    // Create system instruction specifically for flashcard generation
    const systemPrompt = `You are a flashcard generation assistant that creates educational content.
    Generate exactly ${cardCount} flashcards about the requested topic.
    Use knowledge from the vector store to create accurate, relevant flashcards.
    Each flashcard should have a clear question on the front and a detailed answer on the back.
    Format your response as a valid JSON object with a "flashcards" array.
    Each item in the array should have "front" and "back" properties.
    Do not include any text explanations outside of the JSON structure.`;
    
    // Run the Assistant on the thread
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
        "OpenAI-Beta": "assistants=v2"
      },
      body: JSON.stringify({
        assistant_id: assistantId,
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
          "Authorization": `Bearer ${openaiApiKey}`,
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
      
      // Log status every 10 seconds or if status changes
      if (attempts % 10 === 0 || runStatus !== "in_progress") {
        console.log(`Run status (attempt ${attempts}): ${runStatus}`);
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
        "Authorization": `Bearer ${openaiApiKey}`,
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
    
    const responseText = textContent.text.value;
    console.log("Assistant response length:", responseText.length);
    
    // Extract JSON content containing flashcards
    let flashcardsContent;
    try {
      // Find JSON content in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        flashcardsContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON object found in response");
      }
    } catch (e) {
      console.error("Failed to parse JSON from response:", e);
      console.log("Raw response (truncated):", responseText.substring(0, 500));
      throw new Error("Failed to parse flashcards from response");
    }
    
    // Validate that we got the correct number of flashcards
    if (!flashcardsContent.flashcards || flashcardsContent.flashcards.length === 0) {
      console.error("No flashcards were found in the response");
      console.log("Raw response (truncated):", responseText.substring(0, 500));
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
