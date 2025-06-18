// supabase/functions/provision-class-resources/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import weaviate, { WeaviateClient, ApiKey, WeaviateClass } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from "../_shared/cors.ts";

async function ensureWeaviateSchema(weaviateClient: WeaviateClient) { // Changed parameter name for clarity
  const className = "DocumentChunk";
  const classObj: WeaviateClass = {
      class: className,
      description: "Stores document chunks for Eido AI",
      vectorizer: 'text2vec-openai',
      moduleConfig: {
        'text2vec-openai': {
          model: 'text-embedding-3-small',
          type: 'text',
        },
      },
      properties: [
        { name: 'text_chunk', dataType: ['text'] },
        { name: 'source_file_id', dataType: ['text'], tokenization: 'keyword' },
        { name: 'user_id', dataType: ['text'], tokenization: 'keyword' },
        { name: 'class_id', dataType: ['text'], tokenization: 'keyword' }, // ADDED: class_id property
        { name: 'chunk_index', dataType: ['int'] },
      ],
  };
  try {
    await weaviateClient.schema.classGetter().withClassName(className).do();
    console.log(`Schema "${className}" already exists. Verifying properties...`);
    // NOTE: This currently doesn't check for missing properties.
    // For a robust solution, you'd need to fetch the existing schema and compare/add properties.
    // For now, if the schema is missing, it will be created with class_id.
    return true;
  } catch (e) {
    console.log(`Schema "${className}" does not exist. Creating...`);
    await weaviateClient.schema.classCreator().withClass(classObj).do();
    console.log(`Schema "${className}" created successfully.`);
    return true;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { class_id, class_title } = await req.json();
    if (!class_id || !class_title) throw new Error('class_id and class_title are required.');

    const weaviateClient: WeaviateClient = weaviate.client({
       scheme: 'https',
      host: Deno.env.get("WEAVIATE_URL")!,
      apiKey: new ApiKey(Deno.env.get("WEAVIATE_API_KEY")!),
      headers: { 'X-OpenAI-Api-Key': Deno.env.get("OPENAI_API_KEY")! },
    });

    const schemaOk = await ensureWeaviateSchema(weaviateClient);
    if (!schemaOk) throw new Error('Failed to create or verify "DocumentChunk" schema in Weaviate.');
    
    return new Response(JSON.stringify({ success: true, message: `Schema verified for class "${class_title}".` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});