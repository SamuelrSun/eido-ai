import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { user_id, class_id, includeVectors = false } = await req.json();

    if (!user_id) throw new Error("Missing 'user_id' in request.");
    
    const client: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: Deno.env.get('WEAVIATE_URL')!,
      apiKey: new ApiKey(Deno.env.get('WEAVIATE_API_KEY')!),
      headers: { 'X-OpenAI-Api-Key': Deno.env.get('OPENAI_API_KEY')! },
    });

    const query = client.graphql.get()
      .withClassName('DocumentChunk')
      .withLimit(10)
      .withFields('source_file_name page_number text_chunk user_id class_id source_file_id');

    const whereClause: any = {
      operator: 'And',
      operands: [
        { path: ['user_id'], operator: 'Equal', valueText: user_id },
        ...(class_id ? [{ path: ['class_id'], operator: 'Equal', valueText: class_id }] : []),
      ],
    };

    query.withWhere(whereClause);

    if (includeVectors) {
      query.withFields('_additional { vector }');
    }

    const response = await query.do();
    const results = response?.data?.Get?.DocumentChunk ?? [];

    const schema = await client.schema.classGetter().withClassName('DocumentChunk').do();

    return new Response(JSON.stringify({
      count: results.length,
      chunks: results,
      schema,
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[DEBUG-WEAVIATE-CHUNKS ERROR]:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});