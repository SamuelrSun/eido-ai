// supabase/functions/generate-quiz/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts"; // Ensure this path is correct

const ASSISTANT_RUN_TIMEOUT = 90000; // Increased timeout, quiz generation can be complex

// --- Type Definitions ---
interface QuizQuestion {
  question_text: string; // Ensure this matches the expected output from AI
  options: string[];
  correct_answer_index: number;
  explanation: string;
}

interface RequestBody {
  topic: string;
  questionCount?: number;
  difficulty?: string;
  coverage?: string;
  openAIConfig?: {
    assistantId?: string;
    // vectorStoreId is implicitly used by the assistant if configured
  };
  useRAG?: boolean; // This might be redundant if assistantId implies RAG
}

interface OpenAIThread { id: string; }
interface OpenAIRun {
  id: string;
  status: 'queued' | 'in_progress' | 'cancelling' | 'completed' | 'failed' | 'expired' | 'requires_action';
  last_error?: { message?: string } | null;
}
interface OpenAIMessageContentText { type: "text"; text: { value: string; annotations: unknown[]; };}
interface OpenAIMessage { id: string; role: 'user' | 'assistant'; content: OpenAIMessageContentText[]; }
interface OpenAIMessagesList { data?: OpenAIMessage[]; }

// For Chat Completions fallback
interface OpenAIChatCompletionChoice { message: { content: string; }; }
interface OpenAIChatCompletion { choices: OpenAIChatCompletionChoice[]; }

// Expected structure from AI (for both Assistant and fallback)
interface AIParsedQuizResponse {
    questions: QuizQuestion[];
    // The AI might not directly return timeEstimate, we calculate it.
}


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      topic, 
      questionCount = 10, 
      difficulty = "medium", 
      coverage = "comprehensive", 
      openAIConfig = {} 
    }: RequestBody = await req.json();
    
    if (!topic) {
      throw new Error('Topic is required');
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.error("generate-quiz: OPENAI_API_KEY env var not set.");
      throw new Error('Server configuration error: OpenAI API key is missing.');
    }

    const assistantId = openAIConfig.assistantId;
    let generatedQuestions: QuizQuestion[] = [];
    let usedAssistantFlow = false;

    if (assistantId) {
      usedAssistantFlow = true;
      console.log(`generate-quiz: Using Assistant ID: ${assistantId} for topic: "${topic}", count: ${questionCount}`);

      // 1. Create a Thread
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
        body: JSON.stringify({}),
      });
      if (!threadResponse.ok) throw new Error(`Failed to create assistant thread: ${await threadResponse.text()}`);
      const thread = await threadResponse.json() as OpenAIThread;
      const threadId = thread.id;
      console.log(`generate-quiz: Created thread ID: ${threadId}`);

      // 2. Add a Message to the Thread
      const userMessageContent = `Generate ${questionCount} multiple-choice quiz questions on the topic "${topic}".
The difficulty should be ${difficulty} and the coverage should be ${coverage}.
The questions should be based on the materials provided for this class.
Format your response as a valid JSON object containing a single key "questions" which is an array of objects.
Each object in the "questions" array should have these properties: "question_text", "options" (an array of 4 strings), "correct_answer_index" (0-3), and "explanation".
Example: {"questions": [{"question_text": "What is...", "options": ["A", "B", "C", "D"], "correct_answer_index": 0, "explanation": "Because..."}]}`;

      await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
        body: JSON.stringify({ role: 'user', content: userMessageContent }),
      });
      console.log(`generate-quiz: Added message to thread ${threadId}`);

      // 3. Create a Run
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
        body: JSON.stringify({
          assistant_id: assistantId,
          instructions: `You are an expert quiz generator. Please generate ${questionCount} ${difficulty} quiz questions about "${topic}" with ${coverage} coverage, based on the provided class materials. Output the questions in the specified JSON format: {"questions": [...]}. Ensure content is accurate and relevant.`
        }),
      });
      if (!runResponse.ok) throw new Error(`Failed to run assistant: ${await runResponse.text()}`);
      let run = await runResponse.json() as OpenAIRun;
      console.log(`generate-quiz: Created run ID: ${run.id} for thread ${threadId}`);

      // 4. Poll for Run completion
      const startTime = Date.now();
      while (['queued', 'in_progress', 'cancelling'].includes(run.status)) {
        if (Date.now() - startTime > ASSISTANT_RUN_TIMEOUT) {
          await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}/cancel`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'OpenAI-Beta': 'assistants=v2' }
          });
          throw new Error('Quiz generation (Assistant API) timed out.');
        }
        await new Promise(resolve => setTimeout(resolve, 3000)); // Poll every 3 seconds
        const runStatusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
          headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'OpenAI-Beta': 'assistants=v2' }
        });
        if (!runStatusResponse.ok) throw new Error(`Failed to check assistant run status: ${await runStatusResponse.text()}`);
        run = await runStatusResponse.json() as OpenAIRun;
        console.log(`generate-quiz: Run ${run.id} status: ${run.status}`);
      }

      if (run.status !== 'completed') {
        throw new Error(`Quiz generation (Assistant API) failed. Status: ${run.status}. ${run.last_error?.message || ''}`);
      }

      // 5. Retrieve Messages from the Thread
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages?order=desc&limit=1`, {
        headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'OpenAI-Beta': 'assistants=v2' },
      });
      if (!messagesResponse.ok) throw new Error(`Failed to get assistant messages: ${await messagesResponse.text()}`);
      const messagesData = await messagesResponse.json() as OpenAIMessagesList;
      
      const assistantMessages = messagesData.data?.filter((msg: OpenAIMessage) => msg.role === 'assistant');
      if (!assistantMessages || assistantMessages.length === 0 || !assistantMessages[0].content[0]?.text?.value) {
        throw new Error('No response content from assistant.');
      }

      const rawOutputFromAssistant = assistantMessages[0].content[0].text.value;
      console.log("generate-quiz: Raw output from assistant:", rawOutputFromAssistant);
      
      let jsonStringToParse: string = rawOutputFromAssistant;
      try {
        const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
        const match = rawOutputFromAssistant.match(jsonRegex);
        if (match && match[1]) {
          jsonStringToParse = match[1];
        } else {
          console.warn("generate-quiz: Markdown JSON block not found in assistant response. Attempting to parse entire response.");
        }
        const parsedJson = JSON.parse(jsonStringToParse) as AIParsedQuizResponse;
        if (parsedJson.questions && Array.isArray(parsedJson.questions)) {
          generatedQuestions = parsedJson.questions;
        } else {
          throw new Error("AI response did not follow the expected JSON format (missing 'questions' array).");
        }
      } catch (e) {
        const error = e as Error;
        console.error("generate-quiz: Error parsing JSON from assistant response:", error.message, "\nAttempted to parse:", jsonStringToParse);
        throw new Error(`Could not parse quiz questions from AI response: ${error.message}`);
      }

    } else { // Fallback to Chat Completions API
      usedAssistantFlow = false;
      console.warn("generate-quiz: No assistantId provided. Using fallback Chat Completions API.");
      const systemPrompt = `You are a quiz generator. Create ${questionCount} multiple-choice quiz questions about "${topic}" with ${difficulty} difficulty. For each question, provide 4 answer options with exactly one correct option. Format your response as a valid JSON object containing a single key "questions" which is an array of objects. Each object in the "questions" array should have these properties: "question_text", "options" (an array of 4 strings), "correct_answer_index" (0-3), and "explanation". Example: {"questions": [{"question_text": "What is...", "options": ["A", "B", "C", "D"], "correct_answer_index": 0, "explanation": "Because..."}]}`;
      const userContent = `Generate ${questionCount} ${difficulty} multiple-choice quiz questions about "${topic}" with a ${coverage} coverage of the subject.`;

      const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
          temperature: 0.7,
          response_format: { type: "json_object" }
        }),
      });

      if (!fallbackResponse.ok) {
        const errorText = await fallbackResponse.text();
        console.error('generate-quiz: Fallback OpenAI API error:', fallbackResponse.status, errorText);
        throw new Error(`Fallback OpenAI API error: ${fallbackResponse.status}. ${errorText}`);
      }
      const fallbackData = await fallbackResponse.json() as OpenAIChatCompletion;
      const messageContent = fallbackData.choices[0]?.message?.content;
      if (!messageContent) throw new Error("No content in fallback AI response.");
      
      try {
        const parsedJson = JSON.parse(messageContent) as AIParsedQuizResponse;
        if (parsedJson.questions && Array.isArray(parsedJson.questions)) {
          generatedQuestions = parsedJson.questions;
        } else {
          throw new Error("Fallback AI response did not follow the expected JSON format (missing 'questions' array).");
        }
      } catch (e) {
        const error = e as Error;
        console.error("generate-quiz: Error parsing fallback JSON", error.message, messageContent);
        throw new Error(`Could not parse quiz questions from fallback AI response: ${error.message}`);
      }
    }

    // Validate and format questions
    const validatedQuestions = generatedQuestions.map((q, index) => {
      if (!q.question_text) q.question_text = `Question ${index + 1} about ${topic}`;
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        q.options = ["Option A", "Option B", "Option C", "Option D"]; // Default if options are bad
      }
      if (typeof q.correct_answer_index !== 'number' || q.correct_answer_index < 0 || q.correct_answer_index > 3) {
        q.correct_answer_index = 0; // Default if index is bad
      }
      if (!q.explanation) q.explanation = "No explanation provided.";
      return q;
    });

    const difficultyMultiplier: { [key: string]: number } = { easy: 0.8, medium: 1.0, hard: 1.2 };
    const timeEstimate = Math.ceil(questionCount * (difficultyMultiplier[difficulty.toLowerCase()] || 1.0) * 0.75); // Adjusted time estimate

    console.log(`generate-quiz: Successfully generated ${validatedQuestions.length} questions. Used Assistant: ${usedAssistantFlow}`);
    return new Response(
      JSON.stringify({
        questions: validatedQuestions,
        timeEstimate,
        assistantId: openAIConfig.assistantId, // Return the ID used, if any
        vectorStoreId: null, // vectorStoreId is part of assistant config, not directly returned here unless needed
        usedAssistant: usedAssistantFlow,
        usedFallback: !usedAssistantFlow
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error('generate-quiz: Critical error in function:', error);
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
