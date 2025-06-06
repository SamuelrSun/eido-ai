// supabase/functions/chat/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from "../_shared/cors.ts";

interface HistoryMessage {
  role: 'user' | 'assistant'; content: string;
}
interface OpenAIChatCompletion {
  choices: { message: { content: string; }; }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  console.log("[Chat Function] Received request.");

  let supabaseAdminClient: SupabaseClient;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceRoleKey) throw new Error("Server configuration error: Supabase connection details missing.");
    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: { user } } = await createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    ).auth.getUser();

    if (!user) throw new Error("User not authenticated.");
    console.log(`[Chat Function] Authenticated user: ${user.id}`);


    const { message, history = [], class_id } = await req.json();
    if (!message || !class_id) throw new Error("'message' and 'class_id' are required.");
    console.log(`[Chat Function] Processing request for class_id: ${class_id}`);


    const weaviateHost = Deno.env.get("WEAVIATE_URL");
    const weaviateApiKey = Deno.env.get("WEAVIATE_API_KEY");
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!weaviateHost || !weaviateApiKey || !openAIApiKey) throw new Error('Weaviate/OpenAI secrets not configured.');
    console.log("[Chat Function] All secrets found. Initializing Weaviate client.");

    const weaviateClient: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: weaviateHost,
      apiKey: new ApiKey(weaviateApiKey),
      headers: { 'X-OpenAI-Api-Key': openAIApiKey },
    });

    let contextText = "No context was found in the provided materials for this class.";
    try {
        console.log(`[Chat Function] Querying Weaviate for chunks related to user '${user.id}' and class '${class_id}'.`);
        const weaviateResponse = await weaviateClient.graphql
          .get()
          .withClassName('DocumentChunk')
          .withFields('text_chunk source_file_id') // Also retrieve the source_file_id
          .withNearText({ concepts: [message] })
          .withWhere({
            operator: 'And',
            operands: [
              { path: ['user_id'], operator: 'Equal', valueText: user.id },
              { path: ['class_db_id'], operator: 'Equal', valueText: class_id },
            ],
          })
          .withLimit(5)
          .do();

        const chunks = weaviateResponse.data.Get.DocumentChunk;
        console.log(`[Chat Function] Weaviate query completed. Found ${chunks?.length || 0} relevant chunks.`);

        if (chunks?.length > 0) {
            const sourceFileIds = [...new Set(chunks.map((c: any) => c.source_file_id))];
            const { data: filesData, error: filesError } = await supabaseAdminClient
                .from('files')
                .select('file_id, name, url')
                .in('file_id', sourceFileIds);

            if (filesError) {
                console.error("[Chat Function] Error fetching file details for citations:", filesError);
            }

            const fileMap = new Map(filesData?.map(f => [f.file_id, f]) || []);

            const contextChunks = chunks.map((chunk: any) => {
                const fileInfo = fileMap.get(chunk.source_file_id);
                // Create a special tag that the frontend Markdown renderer will turn into a link
                const citation = fileInfo ? `(Source: [${fileInfo.name}](${fileInfo.url}))` : '';
                return `${chunk.text_chunk} ${citation}`;
            });
            
            contextText = "CONTEXT FROM CLASS MATERIALS:\n\n" + contextChunks.join("\n\n---\n\n");
            console.log(`[Chat Function] Generated context text (first 500 chars): ${contextText.substring(0, 500)}`);
        } else {
            console.log(`[Chat Function] No relevant chunks found in Weaviate for the query.`);
        }
    } catch (weaviateError) {
        console.error("[Chat Function] Error querying Weaviate. The RAG context will be empty.", weaviateError);
    }
    
    const systemPrompt = `You are a helpful AI Tutor. Your primary goal is to answer the user's question based on the context provided from their class materials.
Your response MUST follow these rules:
1.  Identify the key points from the context that answer the user's question.
2.  Present these points as a correctly incrementing numbered list (1., 2., 3., etc.).
3.  For each point, format it exactly as follows: **The Point**: A short, synthesized elaboration on the point. Do NOT use a newline after the colon.
4.  After your main response, include a "Sources" section listing the citations provided in the context.

Example:
**1. Attacks against administrative hosts and accounts**: These attacks target superuser-level accounts with extensive privileges.
**2. Attacks against regular users**: Regular user accounts can be exploited through phishing or social engineering to gain access.

Sources:
(Source: [lala.pdf](http://example.com/lala.pdf))

If the context does not contain the answer, you MUST state that the information is not in the provided materials before attempting to answer from your general knowledge.

CONTEXT:
---
${contextText}
---
`;
    console.log("[Chat Function] Sending request to OpenAI with generated prompt.");

    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: message }],
        temperature: 0.5,
      }),
    });

    if (!openAIResponse.ok) throw new Error(`OpenAI API request failed: ${openAIResponse.status} ${await openAIResponse.text()}`);
    const jsonResponse: OpenAIChatCompletion = await openAIResponse.json();
    const assistantResponse = jsonResponse.choices[0]?.message?.content;
    if (!assistantResponse) throw new Error("No response content from OpenAI.");
    
    return new Response(JSON.stringify({ response: assistantResponse.trim() }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    console.error("Critical error in chat function:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
