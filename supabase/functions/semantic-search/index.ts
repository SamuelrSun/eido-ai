// supabase/functions/semantic-search/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize clients and environment variables
const WEAVIATE_URL = Deno.env.get('WEAVIATE_URL');
const WEAVIATE_API_KEY = Deno.env.get('WEAVIATE_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

if (!WEAVIATE_URL || !WEAVIATE_API_KEY || !OPENAI_API_KEY) {
  console.error("Missing environment variables for Weaviate or OpenAI.");
}

// Define the shape of a search result we'll return to the frontend
interface SearchResult {
  file_id: string;
  file_name: string;
  folder_id: string | null;
  page_number: number;
  snippet: string; // The matching text chunk
  class_id: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the user and get the search query from the request body
    const { query, class_id } = await req.json();
    if (!query) throw new Error("A 'query' parameter is required.");

    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await userSupabaseClient.auth.getUser();
    if (!user) throw new Error('Authentication failed.');

    // Initialize Weaviate and Admin Supabase clients
    const weaviateClient: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: WEAVIATE_URL!,
      apiKey: new ApiKey(WEAVIATE_API_KEY!),
    });
    const adminSupabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // 2. Create a vector embedding for the user's search query using OpenAI
    console.log(`[SEARCH] Creating embedding for query: "${query}"`);
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY!}` },
      body: JSON.stringify({
        input: query,
        model: "text-embedding-3-small", // A powerful and cost-effective model for embeddings
      }),
    });
    if (!embeddingResponse.ok) {
        const errorBody = await embeddingResponse.json();
        throw new Error(`Failed to create query embedding: ${errorBody.error.message}`);
    }
    const embeddingData = await embeddingResponse.json();
    const queryVector = embeddingData.data[0].embedding;
    console.log(`[SEARCH] Embedding created successfully.`);

    // 3. Perform the semantic search in Weaviate using the query vector
    console.log(`[SEARCH] Performing nearVector search in Weaviate...`);
    
    // Construct the 'where' filter to scope the search
    const whereOperands = [
        { path: ['user_id'], operator: 'Equal', valueText: user.id },
    ];
    if (class_id) {
        whereOperands.push({ path: ['class_id'], operator: 'Equal', valueText: class_id });
    }

    const weaviateResponse = await weaviateClient.graphql
      .get()
      .withClassName('DocumentChunk')
      .withNearVector({ vector: queryVector }) // Use the vector to find similar chunks
      .withLimit(10) // Return the top 10 most relevant results
      .withWhere({
          operator: 'And',
          operands: whereOperands,
      })
      .withFields('source_file_id source_file_name folder_id page_number text_chunk class_id')
      .do();

    const retrievedChunks = weaviateResponse.data.Get.DocumentChunk;
    console.log(`[SEARCH] Found ${retrievedChunks?.length || 0} relevant chunks.`);

    // 4. Format the results for the frontend
    const searchResults: SearchResult[] = (retrievedChunks || []).map((chunk: any) => ({
      file_id: chunk.source_file_id,
      file_name: chunk.source_file_name,
      folder_id: chunk.folder_id,
      page_number: chunk.page_number,
      snippet: chunk.text_chunk, // This is the actual text content that matched the search
      class_id: chunk.class_id,
    }));

    // 5. Return the results
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
