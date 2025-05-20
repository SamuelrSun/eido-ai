// supabase/functions/chat/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASSISTANT_RUN_TIMEOUT = 45000; 

// OpenAI Annotation Types (assuming these are defined as before)
interface FileCitationAnnotation { type: "file_citation"; text: string; start_index: number; end_index: number; file_citation: { file_id: string; quote?: string; }; }
interface FilePathAnnotation { type: "file_path"; text: string; start_index: number; end_index: number; file_path: { file_id: string; }; }
type Annotation = FileCitationAnnotation | FilePathAnnotation;
interface OpenAIMessageContentText { type: "text"; text: { value: string; annotations: Annotation[]; }; }
type OpenAIMessageContent = OpenAIMessageContentText;
interface OpenAIMessage { id: string; object: string; created_at: number; thread_id: string; status?: "in_progress" | "incomplete" | "completed"; role: "user" | "assistant"; content: OpenAIMessageContent[]; assistant_id?: string | null; run_id?: string | null; attachments?: unknown[] | null; metadata?: Record<string, unknown> | null; }
interface OpenAIThread { id: string; }
interface OpenAIRun { id: string; status: 'queued' | 'in_progress' | 'cancelling' | 'completed' | 'failed' | 'expired' | 'requires_action'; last_error?: { message?: string } | null; }
interface OpenAIMessagesList { data?: OpenAIMessage[]; }
interface OpenAIChatCompletionChoice { message: { content: string; }; }
interface OpenAIChatCompletion { choices: OpenAIChatCompletionChoice[]; }


// Helper function to clean up excessive newlines
function cleanResponseText(text: string): string {
  let cleaned = text;
  // Replace 3 or more newlines with exactly two (paragraph break)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  // Remove newlines that might occur directly after a list marker followed by a space
  // e.g., "1. \nSome text" -> "1. Some text"
  // e.g., "- \nSome text" -> "- Some text"
  cleaned = cleaned.replace(/^(\s*(\d+\.|-|\*)\s+)\n+/gm, '$1');
  // Remove leading/trailing newlines from the entire response
  cleaned = cleaned.trim();
  return cleaned;
}


serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseAdminClient: SupabaseClient; 

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) throw new Error('Server configuration error: OpenAI API key is missing.');

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceRoleKey) throw new Error("Server configuration error: Supabase connection details missing.");
    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { message, history = [], openAIConfig = {}, knowledgeBase = "the current topic" } = await req.json();
    if (!message) throw new Error("User message is required.");

    const assistantId = openAIConfig.assistantId;
    // const vectorStoreId = openAIConfig.vectorStoreId; // Not directly used in prompt, but by assistant

    console.log(`[CHAT_FN] Request for: "${knowledgeBase}". AssistantID: ${assistantId || 'N/A'}`);

    // MODIFIED: Added instruction for compact lists
    const citationInstructions = `
      When you use information from provided files, your response will contain annotations like 【1:0†source】 or similar.
      These annotations will be automatically replaced by the system with proper citations.
      If a file URL is available, the citation will be a Markdown link like [filename.pdf](file_url).
      If a file URL is not available, the citation will be like (filename.pdf).
      Focus on answering the question accurately using the file content. 
      Do NOT add any markdown styling (like italics or bold) to the annotation placeholders (e.g., do not write *【1:0†source】*).
      You do not need to manually create citation strings or include raw file paths in your narrative text.
    `;

    // MODIFIED: Enhanced instructions for list formatting
    const assistantBaseInstructions = `You are an AI Tutor for the class: "${knowledgeBase}". ${citationInstructions} Please be helpful and clear. 
    When presenting lists or multiple points, use markdown formatting such as bullet points (-) or numbered lists (1., 2.) for better readability.
    Ensure that list items are compact. Do not add empty newlines between list items unless it's a new paragraph within an item. 
    For example, prefer:
    1. Point one.
    2. Point two.
    Instead of:
    1. Point one.

    2. Point two.`;

    if (assistantId) {
      try {
        const threadResponse = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
          body: JSON.stringify({ messages: [...history.map((h: {role: string, content: string}) => ({ role: h.role, content: h.content })), { role: 'user', content: message }] }),
        });
        if (!threadResponse.ok) throw new Error(`Failed to create assistant thread: ${await threadResponse.text()}`);
        const thread = await threadResponse.json() as OpenAIThread;
        const threadId = thread.id;

        const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
          body: JSON.stringify({ assistant_id: assistantId, instructions: assistantBaseInstructions }),
        });
        if (!runResponse.ok) throw new Error(`Failed to run assistant: ${await runResponse.text()}`);
        let run = await runResponse.json() as OpenAIRun;

        const startTime = Date.now();
        while (['queued', 'in_progress', 'cancelling'].includes(run.status)) {
          if (Date.now() - startTime > ASSISTANT_RUN_TIMEOUT) {
            await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}/cancel`, { method: 'POST', headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'OpenAI-Beta': 'assistants=v2' }});
            throw new Error('Assistant run timed out.');
          }
          await new Promise(resolve => setTimeout(resolve, 1500));
          const runStatusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, { headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'OpenAI-Beta': 'assistants=v2' } });
          if (!runStatusResponse.ok) throw new Error(`Failed to check assistant run status: ${await runStatusResponse.text()}`);
          run = await runStatusResponse.json() as OpenAIRun;
        }

        if (run.status === 'completed') {
          const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages?order=desc`, {
            headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'OpenAI-Beta': 'assistants=v2' },
          });
          if (!messagesResponse.ok) throw new Error(`Failed to get assistant messages: ${await messagesResponse.text()}`);
          const messagesData = await messagesResponse.json() as OpenAIMessagesList;
          
          let assistantMessageContent = "";
          const latestAssistantMessages = messagesData.data?.filter((msg: OpenAIMessage) => msg.role === 'assistant');

          if (latestAssistantMessages && latestAssistantMessages.length > 0) {
            const latestMsg = latestAssistantMessages[0];
            if (latestMsg.content && latestMsg.content.length > 0 && latestMsg.content[0].type === 'text') {
              let rawText = latestMsg.content[0].text.value;
              const annotations: Annotation[] = latestMsg.content[0].text.annotations || [];
              
              const replacements: {start: number, end: number, text: string}[] = [];
              for (const annotation of annotations) {
                let openAIFileId: string | undefined;
                if (annotation.type === "file_citation") openAIFileId = annotation.file_citation.file_id;
                else if (annotation.type === "file_path") openAIFileId = annotation.file_path.file_id;

                if (openAIFileId) {
                  const { data: fileData, error: dbError } = await supabaseAdminClient
                    .from('files')
                    .select('name, url') 
                    .eq('openai_file_id', openAIFileId)
                    .single();
                  
                  let citationText = `(${annotation.text.trim() || `Source: ${openAIFileId}`})`;
                  if (!dbError && fileData && fileData.name) {
                    let urlForLink = fileData.url;
                    if (urlForLink) {
                      urlForLink = urlForLink.replace(/file%3Cem%3Estorage/g, 'file_storage')
                                             .replace(/file%3C\/em%3Estorage/g, 'file_storage')
                                             .replace(/file<em>storage/g, 'file_storage');
                      citationText = `([${fileData.name}](${urlForLink}))`;
                    } else {
                      citationText = `(${fileData.name})`; 
                    }
                  }
                  replacements.push({ start: annotation.start_index, end: annotation.end_index, text: ` ${citationText} ` });
                }
              }
              replacements.sort((a, b) => b.start - a.start);
              for (const rep of replacements) {
                rawText = rawText.substring(0, rep.start) + rep.text + rawText.substring(rep.end);
              }
              
              assistantMessageContent = rawText; 
              assistantMessageContent = assistantMessageContent.replace(/【\s*\d+:\d+†(?:source)?\s*】/g, ''); 
              assistantMessageContent = assistantMessageContent.replace(/\*([(\[][^)]*?[)\]])\*/g, '$1'); 
              assistantMessageContent = assistantMessageContent.replace(/_([(\[][^)]*?[)\]])_/g, '$1'); 
              assistantMessageContent = assistantMessageContent.replace(/(\[[^\]]+\]\([^)]+\))\s*\|\s*\1/gi, '$1');
              assistantMessageContent = assistantMessageContent.replace(/(\([^)]+\.(?:pdf|docx?|pptx?|txt))\)\s*\|\s*\1/gi, '$1');
              
              // Apply cleanup for newlines
              assistantMessageContent = cleanResponseText(assistantMessageContent);
            }
          }

          if (!assistantMessageContent && latestAssistantMessages && latestAssistantMessages.length > 0 && latestAssistantMessages[0].content[0]?.type === 'text') {
             assistantMessageContent = cleanResponseText(latestAssistantMessages[0].content[0].text.value || "[Could not retrieve citation details]");
          } else if (!assistantMessageContent) {
            throw new Error('No assistant response content received.');
          }

          return new Response(JSON.stringify({ response: assistantMessageContent, assistantId: assistantId, vectorStoreId: openAIConfig.vectorStoreId, usedAssistant: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else {
          throw new Error(`Assistant run failed. Status: ${run.status}. ${run.last_error?.message || ''}`);
        }
      } catch (assistantError) {
        console.error('Assistant API interaction error:', assistantError);
        console.warn("Falling back to general knowledge Chat Completions API due to Assistant error.");
      }
    }

    // Fallback logic
    console.log("Using fallback Chat Completions API.");
    // MODIFIED: Added instruction for compact lists to fallback as well
    let systemMessageContent = `You are a helpful AI Tutor. The user is asking about "${knowledgeBase}". Provide clear and concise explanations. When presenting lists or multiple points, use markdown formatting such as bullet points (-) or numbered lists (1., 2.) for better readability. Ensure that list items are compact and do not have empty lines between them unless it's a new paragraph within an item.`;
    if (assistantId) systemMessageContent += ` (Note: An attempt to use a specialized class assistant (ID: ${assistantId}) failed.)`;
    else systemMessageContent += ` (Note: No specific class assistant was configured.)`;

    const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemMessageContent }, ...history, { role: 'user', content: message }], temperature: 0.7 }),
    });
    if (!fallbackResponse.ok) throw new Error(`Fallback OpenAI API error: ${fallbackResponse.status}. ${await fallbackResponse.text()}`);
    const fallbackData = await fallbackResponse.json() as OpenAIChatCompletion;
    let fallbackMessageContent = fallbackData.choices?.[0]?.message?.content || ""; 
    if (!fallbackMessageContent) throw new Error('Invalid response from fallback OpenAI API');
    
    // Apply cleanup for newlines to fallback response
    fallbackMessageContent = cleanResponseText(fallbackMessageContent);

    return new Response(JSON.stringify({ response: fallbackMessageContent, assistantId: assistantId, vectorStoreId: openAIConfig.vectorStoreId, usedAssistant: false, usedFallback: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('Critical error in chat function:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }),
      { status: errorMessage.includes("required") || errorMessage.includes("OpenAI API key") || errorMessage.includes("Supabase connection") ? 400 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
