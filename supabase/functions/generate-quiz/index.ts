
// Follow this setup guide to integrate the Deno runtime into your application:
// https://docs.supabase.com/guides/functions/connect-to-database

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2"
import { corsHeaders } from "../_shared/cors.ts"

// OpenAI API key from environment variable
const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

// Vector store ID and assistant ID are reused from the flashcards function
const vectorStoreId = "vs_681a9a95ea088191b7c66683f0f3b9cf";
const assistantId = "asst_u7TVc67jaF4bb2qsUzasOWSs";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface GenerateQuizParams {
  title: string;
  questionCount: number;
  difficulty: string;
  coverage: string;
}

serve(async (req) => {
  console.log("Function invoked: generate-quiz");
  
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
    
    const { title, questionCount, difficulty, coverage }: GenerateQuizParams = await req.json()
    console.log(`Generating ${questionCount} ${difficulty} quiz questions for: ${title} covering ${coverage}`);
    
    // Query the content from the embeddings table
    const { data: embeddingData, error: embeddingError } = await supabaseClient
      .from('embeddings')
      .select('content')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (embeddingError) {
      console.error("Error fetching embeddings:", embeddingError);
      throw new Error(`Failed to fetch embeddings: ${embeddingError.message}`);
    }
    
    // Extract topics from the available embeddings
    const availableContent = embeddingData?.map(e => e.content).join(' ').substring(0, 500) || '';
    
    console.log("Available content sample:", availableContent.substring(0, 100) + "...");
    
    // Create a prompt that focuses on quiz generation about the specified topic
    const prompt = `Create ${questionCount} multiple-choice quiz questions about "${title}". 
    Base your questions on the following content from our knowledge base:
    ${availableContent}...
    
    The difficulty level should be: ${difficulty}
    The content coverage should focus on: ${coverage}
    
    Each question should have:
    1. A clear, concise question
    2. Exactly four options (A, B, C, D)
    3. One correct answer
    4. A brief explanation of why the correct answer is right
    
    Make all options plausible and similar in length and style. Don't make incorrect options obviously wrong.
    
    Format your response as a valid JSON object with a "questions" array containing ${questionCount} question objects.
    Each question object should have "question", "options" (array of 4 strings), "correctAnswerIndex" (0-3), and "explanation" properties.
    Use proper JSON formatting with double quotes for property names and ensure all commas are properly placed.
    Only use knowledge available in the linked vector store.`;
    
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
    
    // Create system instruction for quiz generation
    const systemPrompt = `You are a quiz generator that creates educational multiple-choice questions.
    Generate exactly ${questionCount} quiz questions about the requested topic: "${title}".
    Use knowledge from the vector store to create accurate, relevant questions.
    Make each question unique and different from the others.
    Each question must have exactly 4 options (A, B, C, D) with only one correct answer.
    Ensure all options are plausible - don't make incorrect options obviously wrong.
    Format your response as valid JSON with a "questions" array.
    Each question object must have:
    - "question": the question text
    - "options": array of 4 strings (the choices)
    - "correctAnswerIndex": number from 0-3 indicating which option is correct
    - "explanation": brief explanation of the correct answer
    Make sure all JSON is properly formatted with no trailing commas and double quotes for property names.
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
    let maxAttempts = 120;  // 2 minutes timeout
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
    
    // Extract JSON content containing quiz questions
    let quizContent;
    try {
      // Find JSON content in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // Clean the JSON string to fix any formatting issues
        let jsonStr = jsonMatch[0];
        
        // Fix trailing commas in objects/arrays which are invalid in JSON
        jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*\]/g, ']');
        
        quizContent = JSON.parse(jsonStr);
      } else {
        throw new Error("No JSON object found in response");
      }
    } catch (e) {
      console.error("Failed to parse JSON from response:", e);
      console.log("Raw response (truncated):", responseText.substring(0, 500));
      throw new Error("Failed to parse quiz questions from response");
    }
    
    // Validate that we got the correct number of questions
    if (!quizContent.questions || quizContent.questions.length === 0) {
      console.error("No questions were found in the response");
      console.log("Raw response (truncated):", responseText.substring(0, 500));
      throw new Error('No questions were generated in the response');
    }
    
    if (quizContent.questions.length < questionCount) {
      console.warn(`Requested ${questionCount} questions but only got ${quizContent.questions.length}`);
    }

    // Calculate average time per question based on difficulty
    let timeEstimateMinutes = 0;
    switch(difficulty.toLowerCase()) {
      case 'easy':
        timeEstimateMinutes = questionCount * 0.5; // 30 seconds per question
        break;
      case 'medium':
        timeEstimateMinutes = questionCount * 1; // 1 minute per question
        break;
      case 'hard':
        timeEstimateMinutes = questionCount * 1.5; // 1.5 minutes per question
        break;
      default:
        timeEstimateMinutes = questionCount * 1; // Default to 1 minute per question
    }
    
    // Return the generated quiz questions
    return new Response(
      JSON.stringify({
        questions: quizContent.questions,
        timeEstimate: Math.ceil(timeEstimateMinutes),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unknown error occurred while generating quiz questions'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
