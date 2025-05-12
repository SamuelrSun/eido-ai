// supabase/functions/delete-openai-resources/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts"; // Adjust path if your _shared folder is at the root of functions
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // 1. Get OpenAI API Key from environment variables (secrets)
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY environment variable not set for delete-openai-resources.");
      throw new Error('Server configuration error: OpenAI API key is missing.');
    }
    // 2. Parse request body - expecting assistantId and vectorStoreId
    const { assistantId, vectorStoreId } = await req.json();
    if (!assistantId && !vectorStoreId) {
      throw new Error('Either assistantId or vectorStoreId (or both) are required.');
    }
    const results = {
      assistantDeletion: {
        success: false,
        id: assistantId,
        message: "Not attempted or ID not provided."
      },
      vectorStoreDeletion: {
        success: false,
        id: vectorStoreId,
        message: "Not attempted or ID not provided."
      }
    };
    // 3. Delete OpenAI Assistant if assistantId is provided
    if (assistantId) {
      console.log(`Attempting to delete OpenAI Assistant ID: ${assistantId}`);
      try {
        const response = await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "OpenAI-Beta": "assistants=v2"
          }
        });
        if (response.ok) {
          const deletedAssistant = await response.json(); // { id: string, object: "assistant.deleted", deleted: true }
          results.assistantDeletion = {
            success: deletedAssistant.deleted,
            id: assistantId,
            message: `Assistant ${assistantId} deleted successfully.`
          };
          console.log(`Successfully deleted Assistant ID: ${assistantId}`, deletedAssistant);
        } else {
          const errorData = await response.json().catch(()=>({
              error: {
                message: `OpenAI API Error: ${response.statusText} when deleting assistant ${assistantId}.`
              }
            }));
          results.assistantDeletion = {
            success: false,
            id: assistantId,
            message: `Failed to delete Assistant ${assistantId}: ${errorData.error?.message || response.statusText}`
          };
          console.error(`Failed to delete Assistant ID: ${assistantId}. Status: ${response.status}`, errorData);
        }
      } catch (e) {
        results.assistantDeletion = {
          success: false,
          id: assistantId,
          message: `Error during Assistant deletion: ${e.message}`
        };
        console.error(`Exception during Assistant ID ${assistantId} deletion:`, e);
      }
    }
    // 4. Delete OpenAI Vector Store if vectorStoreId is provided
    // IMPORTANT: Deleting a vector store also deletes all files contained within it from OpenAI's side.
    if (vectorStoreId) {
      console.log(`Attempting to delete OpenAI Vector Store ID: ${vectorStoreId}`);
      try {
        const response = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "OpenAI-Beta": "assistants=v2"
          }
        });
        if (response.ok) {
          const deletedVectorStore = await response.json(); // { id: string, object: "vector_store.deleted", deleted: true }
          results.vectorStoreDeletion = {
            success: deletedVectorStore.deleted,
            id: vectorStoreId,
            message: `Vector Store ${vectorStoreId} deleted successfully.`
          };
          console.log(`Successfully deleted Vector Store ID: ${vectorStoreId}`, deletedVectorStore);
        } else {
          const errorData = await response.json().catch(()=>({
              error: {
                message: `OpenAI API Error: ${response.statusText} when deleting vector store ${vectorStoreId}.`
              }
            }));
          results.vectorStoreDeletion = {
            success: false,
            id: vectorStoreId,
            message: `Failed to delete Vector Store ${vectorStoreId}: ${errorData.error?.message || response.statusText}`
          };
          console.error(`Failed to delete Vector Store ID: ${vectorStoreId}. Status: ${response.status}`, errorData);
        }
      } catch (e) {
        results.vectorStoreDeletion = {
          success: false,
          id: vectorStoreId,
          message: `Error during Vector Store deletion: ${e.message}`
        };
        console.error(`Exception during Vector Store ID ${vectorStoreId} deletion:`, e);
      }
    }
    const overallSuccess = (!assistantId || results.assistantDeletion.success) && (!vectorStoreId || results.vectorStoreDeletion.success);
    return new Response(JSON.stringify({
      success: overallSuccess,
      message: "OpenAI resource deletion process completed.",
      details: results
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: overallSuccess ? 200 : 207
    });
  } catch (error) {
    console.error("Critical error in delete-openai-resources function:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: error.message.includes("required") ? 400 : 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
