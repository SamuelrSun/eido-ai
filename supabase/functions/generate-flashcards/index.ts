// supabase/functions/generate-flashcards/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts"; // Ensure this path is correct

const ASSISTANT_RUN_TIMEOUT = 60000; 

interface FlashcardContent {
  front: string;
  back: string;
}

interface RequestBody {
  title: string;
  cardCount?: number;
  openAIConfig?: {
    assistantId?: string;
  };
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
interface OpenAIChatCompletionChoice { message: { content: string; }; }
interface OpenAIChatCompletion { choices: OpenAIChatCompletionChoice[]; }
interface ParsedFlashcardResponse { flashcards: FlashcardContent[]; }
type ParsedFlashcardArrayResponse = FlashcardContent[];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, cardCount = 10, openAIConfig = {} }: RequestBody = await req.json();
    
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.error("generate-flashcards: OPENAI_API_KEY env var not set.");
      throw new Error('Server configuration error: OpenAI API key is missing.');
    }

    const assistantId = openAIConfig.assistantId;

    if (!assistantId) {
      console.warn("generate-flashcards: No assistantId provided. Using fallback Chat Completions.");
      const genericPrompt = `You are a flashcard generator. Create ${cardCount} flashcards for the topic "${title}". Format each flashcard as a JSON object with "front" and "back" properties. Your response must be a valid JSON object containing a single key "flashcards" which is an array of these objects. Example: {"flashcards": [{"front": "Question 1", "back": "Answer 1"}, {"front": "Question 2", "back": "Answer 2"}]}`;
      
      const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: "You output JSON." },{ role: 'user', content: genericPrompt }], temperature: 0.5, response_format: { type: "json_object" } }),
      });

      if (!fallbackResponse.ok) {
          const errorText = await fallbackResponse.text();
          console.error('generate-flashcards: Fallback OpenAI API error:', fallbackResponse.status, errorText);
          throw new Error(`Fallback OpenAI API error: ${fallbackResponse.status}. ${errorText}`);
      }
      const fallbackData = await fallbackResponse.json() as OpenAIChatCompletion;
      let flashcards: FlashcardContent[] = [];
      try {
          const messageContent = fallbackData.choices[0]?.message?.content;
          if (!messageContent) {
            throw new Error("No content in fallback AI response.");
          }
          const parsedContent = JSON.parse(messageContent) as ParsedFlashcardResponse | ParsedFlashcardArrayResponse;

          if ('flashcards' in parsedContent && Array.isArray(parsedContent.flashcards)) {
               flashcards = parsedContent.flashcards.map((card: FlashcardContent) => ({
                  front: card.front || `Question about ${title}`,
                  back: card.back || "Answer not available"
              }));
          } else if (Array.isArray(parsedContent)) { 
               flashcards = parsedContent.map((card: FlashcardContent) => ({
                  front: card.front || `Question about ${title}`,
                  back: card.back || "Answer not available"
              }));
          } else {
            throw new Error("Fallback AI response did not follow the expected JSON format (expected an object with a 'flashcards' array or a direct array of flashcards).");
          }
      } catch (e) {
          const error = e as Error;
          console.error("generate-flashcards: Error parsing fallback JSON", error.message, fallbackData.choices[0]?.message?.content);
          throw new Error(`Could not parse flashcards from fallback AI response: ${error.message}`);
      }
      return new Response(JSON.stringify({ flashcards }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`generate-flashcards: Using Assistant ID: ${assistantId} for topic: "${title}", count: ${cardCount}`);

    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
      body: JSON.stringify({}),
    });
    if (!threadResponse.ok) throw new Error(`Failed to create assistant thread: ${await threadResponse.text()}`);
    const thread = await threadResponse.json() as OpenAIThread;
    const threadId = thread.id;
    console.log(`generate-flashcards: Created thread ID: ${threadId}`);

    const userMessageContent = `Generate ${cardCount} flashcards on the topic "${title}".
The flashcards should be based on the materials provided for this class.
Format your response as a valid JSON object containing a single key "flashcards" which is an array of objects.
Each object in the "flashcards" array should have two properties: "front" (for the question or term) and "back" (for the answer or definition).
Example: {"flashcards": [{"front": "What is the capital of France?", "back": "Paris"}, {"front": "Define mitosis.", "back": "A type of cell division..."}]}`;

    await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
      body: JSON.stringify({ role: 'user', content: userMessageContent }),
    });
    console.log(`generate-flashcards: Added message to thread ${threadId}`);

    const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
      body: JSON.stringify({
        assistant_id: assistantId,
        instructions: `You are an expert flashcard generator. Please generate ${cardCount} flashcards for the topic "${title}" based on the provided class materials. Output the flashcards in the specified JSON format: {"flashcards": [{"front": "...", "back": "..."}, ...]}. Ensure the content is accurate and relevant to the topic, drawing from the documents you have access to.`
      }),
    });
    if (!runResponse.ok) throw new Error(`Failed to run assistant: ${await runResponse.text()}`);
    let run = await runResponse.json() as OpenAIRun;
    console.log(`generate-flashcards: Created run ID: ${run.id} for thread ${threadId}`);

    const startTime = Date.now();
    while (['queued', 'in_progress', 'cancelling'].includes(run.status)) {
      if (Date.now() - startTime > ASSISTANT_RUN_TIMEOUT) {
        await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}/cancel`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'OpenAI-Beta': 'assistants=v2' }
        });
        throw new Error('Flashcard generation timed out.');
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      const runStatusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
        headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'OpenAI-Beta': 'assistants=v2' }
      });
      if (!runStatusResponse.ok) throw new Error(`Failed to check assistant run status: ${await runStatusResponse.text()}`);
      run = await runStatusResponse.json() as OpenAIRun;
      console.log(`generate-flashcards: Run ${run.id} status: ${run.status}`);
    }

    if (run.status !== 'completed') {
      throw new Error(`Flashcard generation failed. Status: ${run.status}. ${run.last_error?.message || ''}`);
    }

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
    console.log("generate-flashcards: Raw output from assistant:", rawOutputFromAssistant);

    let flashcards: FlashcardContent[] = [];
    // **MODIFICATION: Initialize jsonStringToParse at declaration**
    let jsonStringToParse: string = rawOutputFromAssistant; // Default to raw output, will be refined

    try {
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/; 
      const match = rawOutputFromAssistant.match(jsonRegex);
      
      if (match && match[1]) {
        jsonStringToParse = match[1]; // Assign extracted JSON if match found
        console.log("generate-flashcards: Extracted JSON string:", jsonStringToParse);
      } else {
        // If no markdown block is found, jsonStringToParse already holds rawOutputFromAssistant (from initialization)
        console.warn("generate-flashcards: Markdown JSON block not found in assistant response. Attempting to parse entire response.");
      }

      const parsedJson = JSON.parse(jsonStringToParse) as ParsedFlashcardResponse | ParsedFlashcardArrayResponse;
      if ('flashcards' in parsedJson && Array.isArray(parsedJson.flashcards)) { 
        flashcards = parsedJson.flashcards.map((card: FlashcardContent) => ({ 
            front: card.front || `Question about ${title}`, 
            back: card.back || "Answer not available"     
        }));
      } else if (Array.isArray(parsedJson)) { 
        flashcards = parsedJson.map((card: FlashcardContent) => ({ 
            front: card.front || `Question about ${title}`,
            back: card.back || "Answer not available"
        }));
      }
      else {
        console.error("generate-flashcards: Parsed JSON does not contain a 'flashcards' array or is not an array itself.", parsedJson);
        throw new Error("AI response did not follow the expected JSON format after extraction.");
      }
    } catch (e) {
      const error = e as Error;
      // jsonStringToParse will have a value here for logging
      console.error("generate-flashcards: Error parsing JSON from assistant response:", error.message, "\nAttempted to parse:", jsonStringToParse);
      throw new Error(`Could not parse flashcards from AI response. The format might be incorrect: ${error.message}`);
    }
    
    console.log(`generate-flashcards: Successfully generated and parsed ${flashcards.length} flashcards.`);
    return new Response(
      JSON.stringify({ flashcards }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('generate-flashcards: Critical error in function:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: errorMessage.includes("required") || errorMessage.includes("OpenAI API key") || errorMessage.includes("assistantId") ? 400 : 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
