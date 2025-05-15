// supabase/functions/chat/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASSISTANT_RUN_TIMEOUT = 45000; 

interface FileCitation { file_id: string; quote?: string; }
interface FilePath { file_id: string; }
interface FileCitationAnnotation { type: "file_citation"; text: string; start_index: number; end_index: number; file_citation: FileCitation; }
interface FilePathAnnotation { type: "file_path"; text: string; start_index: number; end_index: number; file_path: FilePath; }
type Annotation = FileCitationAnnotation | FilePathAnnotation;
interface OpenAIMessageContentText { type: "text"; text: { value: string; annotations: Annotation[]; }; }
type OpenAIMessageContent = OpenAIMessageContentText;
interface OpenAIMessage { id: string; object: string; created_at: number; thread_id: string; status?: "in_progress" | "incomplete" | "completed"; role: "user" | "assistant"; content: OpenAIMessageContent[]; assistant_id?: string | null; run_id?: string | null; attachments?: unknown[] | null; metadata?: Record<string, unknown> | null; }
interface OpenAIThread { id: string; }
interface OpenAIRun { id: string; status: 'queued' | 'in_progress' | 'cancelling' | 'completed' | 'failed' | 'expired' | 'requires_action'; last_error?: { message?: string } | null; }
interface OpenAIMessagesList { data?: OpenAIMessage[]; }
interface OpenAIChatCompletionChoice { message: { content: string; }; }
interface OpenAIChatCompletion { choices: OpenAIChatCompletionChoice[]; }

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
    const vectorStoreId = openAIConfig.vectorStoreId;

    console.log(`[CHAT_FN] Request for: "${knowledgeBase}". AssistantID: ${assistantId || 'N/A'}`);

    const citationInstructions = `
      When you use information from provided files, your response will contain annotations like 【1:0†source】 or similar.
      These annotations will be automatically replaced by the system with proper citations.
      If a file URL is available, the citation will be a Markdown link like [filename.pdf](file_url).
      If a file URL is not available, the citation will be like (filename.pdf).
      Focus on answering the question accurately using the file content. 
      Do NOT add any markdown styling (like italics or bold) to the annotation placeholders (e.g., do not write *【1:0†source】*).
      You do not need to manually create citation strings or include raw file paths in your narrative text.
    `;

    const assistantBaseInstructions = `You are an AI Tutor for the class: "${knowledgeBase}". ${citationInstructions} Please be helpful and clear. When presenting lists or multiple points, use markdown formatting such as bullet points (-) or numbered lists (1., 2.) for better readability.`;

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
                  console.log(`[CHAT_FN] Processing annotation for OpenAI File ID: ${openAIFileId}, Original text: "${annotation.text}"`);
                  const { data: fileData, error: dbError } = await supabaseAdminClient
                    .from('files')
                    .select('name, url') 
                    .eq('openai_file_id', openAIFileId)
                    .single();
                  
                  console.log(`[CHAT_FN] DB result for ${openAIFileId} - Name: ${fileData?.name}, URL from DB: "${fileData?.url}", Error: ${dbError?.message}`);

                  let citationText = `(${annotation.text.trim() || `Source: ${openAIFileId}`})`; // Default fallback with parentheses

                  if (!dbError && fileData && fileData.name) {
                    let urlForLink = fileData.url;
                    if (urlForLink) {
                      // ** MORE DIRECT URL HOTFIX **
                      // Replace both encoded and unencoded forms of <em> if they corrupt 'file_storage'
                      urlForLink = urlForLink.replace(/file%3Cem%3Estorage/g, 'file_storage')
                                             .replace(/file%3C\/em%3Estorage/g, 'file_storage') // Handle if slash is also encoded
                                             .replace(/file<em>storage/g, 'file_storage');
                      
                      console.log(`[CHAT_FN] URL after potential hotfix: "${urlForLink}"`);
                      citationText = `([${fileData.name}](${urlForLink}))`; // Wrap Markdown link in parentheses
                    } else {
                      citationText = `(${fileData.name})`; 
                      console.warn(`[CHAT_FN] File record for OpenAI file ID ${openAIFileId} has NO URL. Citation: ${citationText}`);
                    }
                  } else if (dbError) {
                    console.error(`[CHAT_FN] DB lookup error for OpenAI file ID ${openAIFileId}:`, dbError.message);
                  } else {
                     console.warn(`[CHAT_FN] No file record or name in DB for OpenAI file ID ${openAIFileId}. Fallback citation: ${citationText}`);
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
              
              // Simplified italic/bold cleanup: remove them if they are directly around our generated citations.
              // This is less aggressive and relies more on the AI not adding them in the first place.
              assistantMessageContent = assistantMessageContent.replace(/\*([(\[][^)]*?[)\]])\*/g, '$1'); // For * (citation) * or * [citation](url) *
              assistantMessageContent = assistantMessageContent.replace(/_([(\[][^)]*?[)\]])_/g, '$1'); // For _ (citation) _ or _ [citation](url) _

              assistantMessageContent = assistantMessageContent.replace(/(\[[^\]]+\]\([^)]+\))\s*\|\s*\1/gi, '$1');
              assistantMessageContent = assistantMessageContent.replace(/(\([^)]+\.(?:pdf|docx?|pptx?|txt))\)\s*\|\s*\1/gi, '$1');
              
              assistantMessageContent = assistantMessageContent.replace(/[ \t]{2,}/g, ' '); 
              assistantMessageContent = assistantMessageContent.replace(/\n\s*\n/g, '\n\n'); 
              assistantMessageContent = assistantMessageContent.trim(); 
            }
          }

          if (!assistantMessageContent && latestAssistantMessages && latestAssistantMessages.length > 0 && latestAssistantMessages[0].content[0]?.type === 'text') {
             assistantMessageContent = latestAssistantMessages[0].content[0].text.value || "[Could not retrieve citation details]";
          } else if (!assistantMessageContent) {
            console.warn("No textual assistant message content was derived after processing.");
            assistantMessageContent = "[Assistant provided a non-text response or text processing resulted in empty content]";
          }

          return new Response(JSON.stringify({ response: assistantMessageContent, assistantId: assistantId, vectorStoreId: vectorStoreId, usedAssistant: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else {
          throw new Error(`Assistant run failed. Status: ${run.status}. ${run.last_error?.message || ''}`);
        }
      } catch (assistantError) {
        console.error('Assistant API interaction error:', assistantError);
        console.warn("Falling back to general knowledge Chat Completions API due to Assistant error.");
      }
    }

    // Fallback logic ...
    console.log("Using fallback Chat Completions API.");
    let systemMessageContent = `You are a helpful AI Tutor. The user is asking about "${knowledgeBase}". Provide clear and concise explanations. When presenting lists or multiple points, use markdown formatting such as bullet points (-) or numbered lists (1., 2.) for better readability.`;
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
    
    fallbackMessageContent = fallbackMessageContent.replace(/[ \t]{2,}/g, ' ');
    fallbackMessageContent = fallbackMessageContent.replace(/\n{3,}/g, '\n\n');
    fallbackMessageContent = fallbackMessageContent.trim();

    return new Response(JSON.stringify({ response: fallbackMessageContent, assistantId: assistantId, vectorStoreId: vectorStoreId, usedAssistant: false, usedFallback: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('Critical error in chat function:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }),
      { status: errorMessage.includes("required") || errorMessage.includes("OpenAI API key") || errorMessage.includes("Supabase connection") ? 400 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
