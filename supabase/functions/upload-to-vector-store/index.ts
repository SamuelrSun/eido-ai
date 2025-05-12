// supabase/functions/upload-to-vector-store/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY environment variable not set.");
      throw new Error('Server configuration error: OpenAI API key is missing.');
    }

    // Expecting: { files: [{ name: string, type: string, url: string, size?: number, internal_file_id: string }], vectorStoreId: string }
    const { files, vectorStoreId } = await req.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new Error('No files provided for upload or files is not an array.');
    }
    if (!vectorStoreId || typeof vectorStoreId !== 'string') {
      throw new Error('vectorStoreId is required and must be a string.');
    }

    console.log(`Processing ${files.length} files for upload to Vector Store ID: ${vectorStoreId}`);
    const results = [];

    for (const file of files) {
      // Ensure internal_file_id is present
      if (!file.url || !file.name || !file.type || !file.internal_file_id) {
        console.warn(`Skipping file due to missing URL, name, type, or internal_file_id:`, file);
        results.push({
          fileName: file.name || 'Unknown file',
          internal_file_id: file.internal_file_id || null,
          error: 'Missing file URL, name, type, or internal_file_id.',
          success: false
        });
        continue;
      }

      try {
        console.log(`Fetching file content for: ${file.name} (Internal ID: ${file.internal_file_id}) from ${file.url}`);
        const fileResponse = await fetch(file.url);
        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch file from URL: ${file.url}. Status: ${fileResponse.status} ${fileResponse.statusText}`);
        }
        const fileBlob = await fileResponse.blob();

        const formData = new FormData();
        formData.append('file', fileBlob, file.name);
        formData.append('purpose', 'assistants');

        console.log(`Uploading file to OpenAI: ${file.name}`);
        const uploadResponse = await fetch('https://api.openai.com/v1/files', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiApiKey}` },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({ error: { message: `OpenAI API Error: ${uploadResponse.statusText}` }}));
          throw new Error(`OpenAI file upload failed for ${file.name}: ${errorData.error?.message || uploadResponse.statusText}`);
        }
        const openAiFile = await uploadResponse.json();
        console.log(`File uploaded successfully to OpenAI: ${file.name}, OpenAI File ID: ${openAiFile.id}`);

        console.log(`Adding OpenAI File ID ${openAiFile.id} to Vector Store ID ${vectorStoreId}`);
        const addToVectorStoreResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({ file_id: openAiFile.id }),
        });

        if (!addToVectorStoreResponse.ok) {
          const errorData = await addToVectorStoreResponse.json().catch(() => ({ error: { message: `OpenAI API Error: ${addToVectorStoreResponse.statusText}` }}));
          throw new Error(`Failed to add file to Vector Store ${vectorStoreId}: ${errorData.error?.message || addToVectorStoreResponse.statusText}`);
        }
        const vectorStoreFile = await addToVectorStoreResponse.json();
        console.log(`File ${openAiFile.id} successfully added to Vector Store ${vectorStoreId}. Vector Store File ID: ${vectorStoreFile.id}`);

        results.push({
          fileName: file.name,
          internal_file_id: file.internal_file_id, // Pass back the internal ID
          openAiFileId: openAiFile.id,
          vectorStoreFileId: vectorStoreFile.id,
          vectorStoreId: vectorStoreId,
          success: true,
        });

      } catch (fileProcessingError) {
        console.error(`Error processing file ${file.name} (Internal ID: ${file.internal_file_id}):`, fileProcessingError);
        results.push({
          fileName: file.name,
          internal_file_id: file.internal_file_id,
          error: fileProcessingError.message,
          success: false,
        });
      }
    }

    const allSuccessful = results.every((r) => r.success);
    return new Response(
      JSON.stringify({
        success: allSuccessful,
        results: results, // This now includes internal_file_id and openAiFileId
        message: `Processed ${results.filter((r) => r.success).length} of ${files.length} files.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: allSuccessful ? 200 : 207 }
    );
  } catch (error) {
    console.error('Critical error in upload-to-vector-store function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: error instanceof SyntaxError ? 400 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
