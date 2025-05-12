// supabase/functions/chat/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASSISTANT_RUN_TIMEOUT = 45000;

interface FileCitationAnnotation {
  type: "file_citation";
  text: string;
  start_index: number;
  end_index: number;
  file_citation: { file_id: string; quote?: string; };
}
interface FilePathAnnotation {
  type: "file_path";
  text: string;
  start_index: number;
  end_index: number;
  file_path: { file_id: string; };
}
type Annotation = FileCitationAnnotation | FilePathAnnotation;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseAdminClient: any;

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

    console.log(`Chat request for: "${knowledgeBase}". AssistantID: ${assistantId || 'N/A'}`);

    // Modified instructions for the LLM
    const citationInstructions = `
      When you use information from provided files, your response will contain annotations.
      These annotations will be automatically replaced by the system with proper citations in the format (Document Title | filename.pdf).
      Focus on answering the question accurately using the file content. You do not need to manually create citation strings or include raw file paths in your narrative text.
      If you naturally mention a document, that's fine, but the system will handle the formal citation placeholders.
    `;

    if (assistantId) {
      try {
        const threadResponse = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
          body: JSON.stringify({ messages: [...history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: message }] }),
        });
        if (!threadResponse.ok) throw new Error(`Failed to create assistant thread: ${await threadResponse.text()}`);
        const thread = await threadResponse.json();
        const threadId = thread.id;

        const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json', 'OpenAI-Beta': 'assistants=v2' },
          body: JSON.stringify({ assistant_id: assistantId, instructions: `You are an AI Tutor for the class: "${knowledgeBase}". ${citationInstructions} Please be helpful and clear.` }),
        });
        if (!runResponse.ok) throw new Error(`Failed to run assistant: ${await runResponse.text()}`);
        let run = await runResponse.json();

        const startTime = Date.now();
        while (['queued', 'in_progress', 'cancelling'].includes(run.status)) {
          if (Date.now() - startTime > ASSISTANT_RUN_TIMEOUT) {
            await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}/cancel`, { method: 'POST', headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'OpenAI-Beta': 'assistants=v2' }});
            throw new Error('Assistant run timed out.');
          }
          await new Promise(resolve => setTimeout(resolve, 1500));
          const runStatusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, { headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'OpenAI-Beta': 'assistants=v2' } });
          if (!runStatusResponse.ok) throw new Error(`Failed to check assistant run status: ${await runStatusResponse.text()}`);
          run = await runStatusResponse.json();
        }

        if (run.status === 'completed') {
          const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages?order=desc`, {
            headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'OpenAI-Beta': 'assistants=v2' },
          });
          if (!messagesResponse.ok) throw new Error(`Failed to get assistant messages: ${await messagesResponse.text()}`);
          const messagesData = await messagesResponse.json();
          let assistantMessageContent = "";
          const latestAssistantMessages = messagesData.data?.filter((msg: any) => msg.role === 'assistant');

          if (latestAssistantMessages && latestAssistantMessages.length > 0) {
            const latestMsg = latestAssistantMessages[0];
            if (latestMsg.content && latestMsg.content.length > 0 && latestMsg.content[0].type === 'text') {
              let rawText = latestMsg.content[0].text.value;
              const annotations: Annotation[] = latestMsg.content[0].text.annotations || [];
              annotations.sort((a, b) => b.start_index - a.start_index);

              for (const annotation of annotations) {
                let openAIFileId: string | undefined;
                if (annotation.type === "file_citation") openAIFileId = annotation.file_citation.file_id;
                else if (annotation.type === "file_path") openAIFileId = annotation.file_path.file_id;

                if (openAIFileId) {
                  console.log(`Processing annotation for OpenAI File ID: ${openAIFileId}, Annotation text: "${annotation.text}"`);
                  const { data: fileData, error: dbError } = await supabaseAdminClient
                    .from('files')
                    .select('name, document_title') // 'name' is filename.pdf, 'document_title' is user-friendly
                    .eq('openai_file_id', openAIFileId)
                    .single();

                  let citationText = `(Source: ${openAIFileId})`; // Fallback
                  if (dbError) {
                    console.error(`DB lookup error for OpenAI file ID ${openAIFileId}:`, dbError.message);
                  } else if (fileData) {
                    const docTitle = fileData.document_title || fileData.name; // Use document_title or fallback to filename
                    const fileName = fileData.name; // This is the actual filename.pdf
                    citationText = `(${docTitle} | ${fileName})`;
                    console.log(`Constructed citation for ${openAIFileId}: ${citationText}`);
                  } else {
                     console.warn(`No file record found in DB for OpenAI file ID ${openAIFileId}. Using fallback citation.`);
                  }
                  rawText = rawText.substring(0, annotation.start_index) + citationText + rawText.substring(annotation.end_index);
                }
              }
              // Final cleanup of any remaining OpenAI-specific citation prefixes like "【d+:d†" or "d:d†"
              // This regex looks for patterns like "【1:23†", "1:23†" that might be adjacent to our inserted citation or other text.
              // It specifically targets those that might be left if the annotation.text was just the filename.
              assistantMessageContent = rawText.replace(/【\s*\d+:\d+†\s*|\s*\d+:\d+†\s*/g, '');
            }
          }

          if (!assistantMessageContent && latestAssistantMessages && latestAssistantMessages.length > 0) {
            // If content was purely an annotation that got replaced by an empty string (e.g. failed lookup and empty fallback)
             assistantMessageContent = latestAssistantMessages[0].content[0].text.value || "[Could not retrieve citation details]";
          } else if (!assistantMessageContent) {
            throw new Error('No assistant response content received.');
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

    // Fallback to standard Chat Completions API
    console.log("Using fallback Chat Completions API.");
    let systemMessageContent = `You are a helpful AI Tutor. The user is asking about "${knowledgeBase}". Provide clear and concise explanations.`;
    if (assistantId) systemMessageContent += ` (Note: An attempt to use a specialized class assistant (ID: ${assistantId}) failed, so I am providing a general response.)`;
    else systemMessageContent += ` (Note: No specific class assistant was configured, so I am providing a general response based on my broad knowledge.)`;

    const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemMessageContent }, ...history, { role: 'user', content: message }], temperature: 0.7 }),
    });
    if (!fallbackResponse.ok) throw new Error(`Fallback OpenAI API error: ${fallbackResponse.status}. ${await fallbackResponse.text()}`);
    const fallbackData = await fallbackResponse.json();
    const fallbackMessageContent = fallbackData.choices?.[0]?.message?.content;
    if (!fallbackMessageContent) throw new Error('Invalid response from fallback OpenAI API');

    return new Response(JSON.stringify({ response: fallbackMessageContent, assistantId: assistantId, vectorStoreId: vectorStoreId, usedAssistant: false, usedFallback: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Critical error in chat function:', error);
    return new Response(JSON.stringify({ error: error.message }),
      { status: error.message.includes("required") || error.message.includes("OpenAI API key") || error.message.includes("Supabase connection") ? 400 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});