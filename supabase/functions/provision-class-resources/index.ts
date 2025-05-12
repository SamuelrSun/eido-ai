// supabase/functions/provision-class-resources/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts"; // Adjust path if your _shared folder is elsewhere

// Helper function to create an OpenAI Vector Store
async function createOpenAIVectorStore(apiKey: string, name: string) {
  console.log(`Creating OpenAI Vector Store with name: ${name}`);
  const response = await fetch("https://api.openai.com/v1/vector_stores", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v2",
    },
    body: JSON.stringify({
      name: name,
      // expires_after: { anchor: "last_active_at", days: 7 } // Optional: set expiration policy
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: `OpenAI API Error: ${response.statusText} when creating vector store.` }}));
    console.error("Failed to create OpenAI Vector Store:", errorData);
    throw new Error(`Failed to create OpenAI Vector Store: ${errorData.error?.message || response.statusText}`);
  }
  const vectorStore = await response.json();
  console.log(`Successfully created Vector Store. ID: ${vectorStore.id}`);
  return vectorStore;
}

// Helper function to create an OpenAI Assistant
async function createOpenAIAssistant(apiKey: string, name: string, instructions: string, vectorStoreId: string) {
  console.log(`Creating OpenAI Assistant with name: ${name}, linked to Vector Store ID: ${vectorStoreId}`);
  const response = await fetch("https://api.openai.com/v1/assistants", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v2",
    },
    body: JSON.stringify({
      name: name,
      instructions: instructions,
      model: "gpt-4o-mini", // Or your preferred model
      tools: [{ type: "file_search" }], // Enable file search (RAG)
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStoreId], // Link to the created vector store
        },
      },
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: { message: `OpenAI API Error: ${response.statusText} when creating assistant.` }}));
    console.error("Failed to create OpenAI Assistant:", errorData);
    throw new Error(`Failed to create OpenAI Assistant: ${errorData.error?.message || response.statusText}`);
  }
  const assistant = await response.json();
  console.log(`Successfully created Assistant. ID: ${assistant.id}`);
  return assistant;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get OpenAI API Key from environment variables (secrets)
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY environment variable not set.");
      throw new Error('Server configuration error: OpenAI API key is missing.');
    }

    // 2. Get Supabase URL and Anon Key for server-side client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // Use Service Role Key for admin operations
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable not set.");
      throw new Error('Server configuration error: Supabase credentials missing.');
    }

    // 3. Parse request body - expecting class_id and class_title
    const { class_id, class_title } = await req.json();
    if (!class_id || !class_title) {
      throw new Error('class_id and class_title are required in the request body.');
    }
    console.log(`Provisioning resources for Class ID: ${class_id}, Title: ${class_title}`);

    // 4. Create OpenAI Vector Store
    const vectorStoreName = `Vector Store for ${class_title} (Class ID: ${class_id})`;
    const vectorStore = await createOpenAIVectorStore(openaiApiKey, vectorStoreName);
    const vectorStoreId = vectorStore.id;

    // 5. Create OpenAI Assistant, linked to the Vector Store
    const assistantName = `Assistant for ${class_title} (Class ID: ${class_id})`;
    const assistantInstructions = `You are a helpful AI assistant for the class titled "${class_title}". Utilize the provided files to answer questions accurately and provide explanations.`;
    const assistant = await createOpenAIAssistant(openaiApiKey, assistantName, assistantInstructions, vectorStoreId);
    const assistantId = assistant.id;

    // 6. Initialize Supabase client with Service Role Key to update the database
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        // Required for server-side client, but we are using service_role key
        // autoRefreshToken: false,
        // persistSession: false
      }
    });

    // 7. Update the 'classes' table with the new vector_store_id and assistant_id
    console.log(`Updating 'classes' table for class_id ${class_id} with Vector Store ID: ${vectorStoreId} and Assistant ID: ${assistantId}`);
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("classes") // Ensure this table name matches your Supabase schema
      .update({
        vector_store_id: vectorStoreId,
        assistant_id: assistantId,
        updated_at: new Date().toISOString(), // Update the timestamp
      })
      .eq("class_id", class_id) // Ensure this column name matches your PK
      .select()
      .single(); // Expecting a single row to be updated

    if (updateError) {
      console.error("Failed to update 'classes' table in Supabase:", updateError);
      // Potentially try to clean up created OpenAI resources if DB update fails
      // await fetch(`https://api.openai.com/v1/assistants/${assistantId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'OpenAI-Beta': 'assistants=v2' } });
      // await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'OpenAI-Beta': 'assistants=v2' } });
      throw new Error(`Failed to update class record in database: ${updateError.message}`);
    }

    if (!updateData) {
        console.error(`No class found with class_id ${class_id} to update, or RLS prevented update.`);
        throw new Error(`Could not find class with ID ${class_id} to update with OpenAI resource IDs.`);
    }

    console.log(`Successfully updated class ${class_id} with OpenAI resource IDs.`, updateData);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully provisioned OpenAI resources for class ${class_title}.`,
        classId: class_id,
        vectorStoreId: vectorStoreId,
        assistantId: assistantId,
        updatedClassRecord: updateData
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Critical error in provision-class-resources function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: error instanceof SyntaxError ? 400 : 500, // Bad JSON vs. server error
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
