
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

// OpenAI API Key - in production, use Deno.env.get
const openaiApiKey = "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";

// The vector store ID to upload files to
const vectorStoreId = "vs_681a9a95ea088191b7c66683f0f3b9cf";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Function invoked: upload-to-vector-store");
    
    // Parse request body
    let requestData; 
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request body - could not parse JSON' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    const { files } = requestData;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid files provided in the request' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }
    
    console.log(`Processing ${files.length} files for upload to vector store`);
    
    // Process each file for upload
    const results = [];
    
    for (const file of files) {
      try {
        if (!file.url) {
          console.error(`Missing URL for file: ${file.name}`);
          results.push({
            name: file.name,
            success: false,
            error: "Missing file URL"
          });
          continue;
        }
        
        // Fetch the file content from the provided URL
        console.log(`Downloading file from URL: ${file.url}`);
        const fileResponse = await fetch(file.url);
        
        if (!fileResponse.ok) {
          throw new Error(`Failed to download file: ${fileResponse.statusText}`);
        }
        
        // Get the file as a blob
        const fileBlob = await fileResponse.blob();
        
        // Create a FormData instance for the file upload
        const formData = new FormData();
        formData.append('file', fileBlob, file.name);
        formData.append('purpose', 'vector_store');
        
        console.log(`Uploading file to OpenAI: ${file.name}`);
        
        // Upload the file to OpenAI
        const uploadResponse = await fetch('https://api.openai.com/v1/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: formData,
        });
        
        // Get response as text first to ensure we can debug any issues
        const uploadResponseText = await uploadResponse.text();
        
        let uploadData;
        try {
          uploadData = JSON.parse(uploadResponseText);
        } catch (parseError) {
          console.error("Failed to parse OpenAI upload response:", uploadResponseText.substring(0, 200));
          throw new Error(`Failed to parse OpenAI upload response: ${uploadResponseText.substring(0, 200)}`);
        }
        
        if (!uploadResponse.ok) {
          throw new Error(uploadData.error?.message || `File upload failed: ${uploadResponse.status}`);
        }
        
        console.log(`File uploaded to OpenAI: ${uploadData.id}`);
        
        // If we got here, the file was uploaded successfully to OpenAI
        // Now add it to the vector store
        const addToVectorStoreResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({
            file_ids: [uploadData.id]
          }),
        });
        
        // Get response as text first for debugging
        const vectorStoreResponseText = await addToVectorStoreResponse.text();
        
        let vectorStoreData;
        try {
          vectorStoreData = JSON.parse(vectorStoreResponseText);
        } catch (parseError) {
          console.error("Failed to parse vector store response:", vectorStoreResponseText.substring(0, 200));
          throw new Error(`Failed to parse vector store response: ${vectorStoreResponseText.substring(0, 200)}`);
        }
        
        if (!addToVectorStoreResponse.ok) {
          throw new Error(vectorStoreData.error?.message || `Adding to vector store failed: ${addToVectorStoreResponse.status}`);
        }
        
        console.log(`File added to vector store: ${file.name}`);
        
        results.push({
          name: file.name,
          success: true,
          file_id: uploadData.id,
        });
        
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        results.push({
          name: file.name,
          success: false,
          error: fileError.message
        });
      }
    }
    
    // Count successes and failures
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} files. Successfully uploaded: ${successCount}, Failed: ${failureCount}`,
        results 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error uploading to vector store:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unknown error occurred during the upload process'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
