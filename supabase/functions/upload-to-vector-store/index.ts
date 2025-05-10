
// Import required modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    // Parse request body
    const { files, openAIConfig } = await req.json();
    
    // Check if required data is provided
    if (!files || !files.length) {
      throw new Error('No files provided for upload');
    }
    
    if (!openAIConfig || !openAIConfig.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    const openaiApiKey = openAIConfig.apiKey;
    
    // For creating or using a specific vector store
    const vectorStoreId = openAIConfig.vectorStoreId || null;
    const assistantId = openAIConfig.assistantId || null;
    
    // Process each file
    const results = [];
    
    console.log(`Processing ${files.length} files for upload`);
    
    for (const file of files) {
      try {
        // Convert base64 to blob
        const base64Data = file.content.split(',')[1];
        if (!base64Data) {
          throw new Error(`Invalid file content format for ${file.name}`);
        }
        
        // Convert base64 to Uint8Array
        const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const fileBlob = new Blob([binaryData], { type: file.type });
        
        // Create a FormData instance for the file upload
        const formData = new FormData();
        formData.append('file', fileBlob, file.name);
        formData.append('purpose', 'assistants');
        
        console.log(`Uploading file to OpenAI: ${file.name}`);
        
        // Upload the file to OpenAI
        const uploadResponse = await fetch('https://api.openai.com/v1/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            // No Content-Type header for FormData
          },
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(`OpenAI file upload failed: ${errorData.error?.message || uploadResponse.statusText}`);
        }
        
        const uploadData = await uploadResponse.json();
        console.log(`File uploaded successfully: ${file.name}, ID: ${uploadData.id}`);
        
        // If we have an assistant ID, attach the file to it
        if (assistantId) {
          console.log(`Attaching file ${uploadData.id} to assistant ${assistantId}`);
          
          const attachResponse = await fetch(`https://api.openai.com/v1/assistants/${assistantId}/files`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiApiKey}`,
              'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify({
              file_id: uploadData.id
            }),
          });
          
          if (!attachResponse.ok) {
            const attachErrorData = await attachResponse.json();
            throw new Error(`Failed to attach file to assistant: ${attachErrorData.error?.message || attachResponse.statusText}`);
          }
          
          const attachData = await attachResponse.json();
          console.log(`File ${uploadData.id} successfully attached to assistant ${assistantId}`);
          
          results.push({
            fileName: file.name,
            fileId: uploadData.id,
            assistantId: assistantId,
            attachmentId: attachData.id,
            success: true
          });
        } else {
          // If no assistant ID, just return success for the file upload
          results.push({
            fileName: file.name,
            fileId: uploadData.id,
            success: true
          });
        }
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        results.push({
          fileName: file.name,
          error: fileError.message,
          success: false
        });
      }
    }
    
    return new Response(
      JSON.stringify({
        success: results.every(r => r.success),
        results: results,
        message: `Processed ${results.filter(r => r.success).length} of ${files.length} files successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in upload-to-vector-store function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
