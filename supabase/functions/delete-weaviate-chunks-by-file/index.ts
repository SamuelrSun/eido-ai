// supabase/functions/delete-weaviate-chunks-by-file/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import weaviate, { WeaviateClient, ApiKey } from 'npm:weaviate-ts-client@2.0.0';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  // This block handles CORS preflight requests.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();
    const { file_id } = JSON.parse(bodyText);

    if (!file_id) {
      throw new Error("Missing 'file_id' in request body.");
    }

    const client: WeaviateClient = weaviate.client({
      scheme: 'https',
      host: Deno.env.get('WEAVIATE_URL')!,
      apiKey: new ApiKey(Deno.env.get('WEAVIATE_API_KEY')!),
    });

    // FIX: The correct method for batch deletion with a filter in this client version
    // is `objectsBatchDeleter`, which takes the class and filter as an argument object.
    const result = await client.batch.objectsBatchDeleter({
      className: 'DocumentChunk',
      where: {
        operator: 'Equal',
        path: ['source_file_id'],
        valueText: file_id,
      },
    });

    // Check for errors in the batch deletion result
    const errors = result.results?.objects?.filter(obj => obj.errors) ?? [];
    if (errors.length > 0) {
        console.error('Weaviate deletion errors:', JSON.stringify(errors, null, 2));
        throw new Error(`Failed to delete some chunks for file_id: ${file_id}`);
    }

    return new Response(JSON.stringify({ success: true, deletedCount: result.results?.matches }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[DELETE-WEAVIATE-CHUNKS ERROR]:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});