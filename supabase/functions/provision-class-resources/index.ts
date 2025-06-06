// supabase/functions/provision-class-resources/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from "../_shared/cors.ts";

async function defineWeaviateSchema(client: WeaviateClient) {
  const weaviateClassName = "DocumentChunk";
  const classObj = {
    class: weaviateClassName,
    description: "Stores document chunks for all users and classes in Eido AI",
    vectorizer: 'text2vec-openai',
    moduleConfig: {
      'text2vec-openai': {
        model: 'text-embedding-3-small',
        type: 'text',
      },
    },
    properties: [
      {
        name: 'text_chunk',
        dataType: ['text']
      },
      {
        name: 'source_file_id',
        dataType: ['text'],
        tokenization: 'word' 
      },
      {
        name: 'class_db_id',
        dataType: ['text'],
        tokenization: 'word' // CORRECTED: Changed from 'whitespace' to 'word' for filtering
      },
      {
        name: 'user_id',
        dataType: ['text'],
        tokenization: 'word' // CORRECTED: Changed from 'whitespace' to 'word' for filtering
      },
      {
        name: 'chunk_index',
        dataType: ['int']
      },
    ],
  };

  try {
    await client.schema.classGetter().withClassName(weaviateClassName).do();
    console.log(`Weaviate class "${weaviateClassName}" already exists. Schema is OK.`);
    return true;
  } catch (err) {
    console.log(`Weaviate class "${weaviateClassName}" not found. Creating it...`);
    try {
      await client.schema.classCreator().withClass(classObj).do();
      console.log(`Weaviate class "${weaviateClassName}" created successfully.`);
      return true;
    } catch (createErr) {
      console.error(`Fatal error creating Weaviate class "${weaviateClassName}":`, createErr);
      return false;
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { class_id, class_title } = await req.json();
    if (!class_id || !class_title) {
      throw new Error('Supabase class_id and class_title are required.');
    }

    const weaviateHost = Deno.env.get("WEAVIATE_URL");
    const weaviateApiKey = Deno.env.get("WEAVIATE_API_KEY");
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!weaviateHost || !weaviateApiKey || !openAIApiKey) {
      throw new Error('Weaviate/OpenAI secrets are not configured.');
    }

    const weaviateClient: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: weaviateHost,
      apiKey: new ApiKey(weaviateApiKey),
      headers: { 'X-OpenAI-Api-Key': openAIApiKey },
    });

    const schemaCreatedOrExists = await defineWeaviateSchema(weaviateClient);
    if (!schemaCreatedOrExists) {
      throw new Error('Failed to create or verify "DocumentChunk" schema in Weaviate.');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully verified Weaviate schema for class "${class_title}".`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Critical error in provision-class-resources:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});