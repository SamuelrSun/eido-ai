// supabase/functions/semantic-search/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from '../_shared/cors.ts';

const WEAVIATE_URL = Deno.env.get('WEAVIATE_URL');
const WEAVIATE_API_KEY = Deno.env.get('WEAVIATE_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface SearchResult {
  file_id: string;
  file_name: string;
  folder_id: string | null;
  page_number: number | null;
  snippet: string;
  class_id: string | null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, class_id } = await req.json();

    if (!query) {
      throw new Error('A search query is required.');
    }

    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await userSupabaseClient.auth.getUser();
    if (!user) throw new Error('Authentication failed.');

    const weaviateClient: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: WEAVIATE_URL!,
      apiKey: new ApiKey(WEAVIATE_API_KEY!),
    });

    const adminSupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (class_id) {
      const { data: member, error: memberError } = await adminSupabaseClient
        .from('class_members')
        .select('role')
        .eq('class_id', class_id)
        .eq('user_id', user.id)
        .in('role', ['owner', 'member'])
        .maybeSingle();

      if (memberError) throw new Error(`Database error checking membership: ${memberError.message}`);
      if (!member) throw new Error("Permission denied: You are not a member of this class.");
    }

    console.log(`[SEARCH] Creating embedding for query: "${query}"`);

    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY!}`
      },
      body: JSON.stringify({
        input: query,
        model: "text-embedding-3-small",
      }),
    });

    if (!embeddingResponse.ok) {
      const errorBody = await embeddingResponse.json();
      throw new Error(`Failed to create query embedding: ${errorBody.error.message}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryVector = embeddingData.data[0].embedding;

    console.log(`[SEARCH] Embedding created successfully.`);
    console.log(`[SEARCH] Performing nearVector search in Weaviate...`);

    const whereFilter: any = {};
    if (class_id) {
        whereFilter.operator = 'Equal';
        whereFilter.path = ['class_id'];
        whereFilter.valueText = class_id;
    } else {
        whereFilter.operator = 'Equal';
        whereFilter.path = ['user_id'];
        whereFilter.valueText = user.id;
    }

    const weaviateResponse = await weaviateClient.graphql
      .get()
      .withClassName('DocumentChunk')
      .withNearVector({ vector: queryVector })
      .withLimit(10)
      .withWhere(whereFilter)
      .withFields('source_file_id source_file_name folder_id page_number text_chunk class_id')
      .do();

    const retrievedChunks = weaviateResponse.data.Get.DocumentChunk;
    console.log(`[SEARCH] Found ${retrievedChunks?.length || 0} relevant chunks.`);

    const searchResults: SearchResult[] = (retrievedChunks || []).map((chunk: any) => ({
      file_id: chunk.source_file_id,
      file_name: chunk.source_file_name,
      folder_id: chunk.folder_id,
      page_number: chunk.page_number,
      snippet: chunk.text_chunk,
      class_id: chunk.class_id,
    }));

    return new Response(JSON.stringify(searchResults), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[SEARCH] Critical error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});