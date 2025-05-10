
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history = [], openAIConfig = {}, knowledgeBase } = await req.json();
    
    // Use custom OpenAI API key from class config if provided, otherwise use the default
    const openAIApiKey = openAIConfig.apiKey || Deno.env.get('OPENAI_API_KEY');
    // Use custom assistant ID from class config if provided
    const assistantId = openAIConfig.assistantId || Deno.env.get('OPENAI_ASSISTANT_ID');
    // Use custom vector store ID from class config if provided
    const vectorStoreId = openAIConfig.vectorStoreId || Deno.env.get('VECTOR_STORE_ID');

    console.log("Using AssistantID:", assistantId);
    console.log("Using VectorStoreID:", vectorStoreId);
    
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not provided. Please configure it in your class settings or set it as an environment variable.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate API key format - accepting both sk-org and standard sk- keys
    if (!openAIApiKey.startsWith('sk-')) {
      return new Response(
        JSON.stringify({ error: 'Invalid OpenAI API key format. Keys should start with "sk-"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // If assistant ID is provided, use it (this is the preferred method for vector stores with assistants API)
    if (assistantId) {
      try {
        console.log(`Attempting to use assistant with ID: ${assistantId}`);
        
        // Create a thread
        const threadResponse = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'  // Using the updated beta header
          },
          body: JSON.stringify({}),
        });

        if (!threadResponse.ok) {
          const errorText = await threadResponse.text();
          console.error('Failed to create thread:', errorText);
          throw new Error(`Failed to create assistant thread: ${errorText}`);
        }

        const threadData = await threadResponse.json();
        const threadId = threadData.id;
        
        // Add message to thread
        const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'  // Updated beta header
          },
          body: JSON.stringify({
            role: 'user',
            content: message
          }),
        });

        if (!messageResponse.ok) {
          const errorText = await messageResponse.text();
          console.error('Failed to add message:', errorText);
          throw new Error(`Failed to add message to thread: ${errorText}`);
        }

        // Run the assistant
        const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'  // Updated beta header
          },
          body: JSON.stringify({
            assistant_id: assistantId
          }),
        });

        if (!runResponse.ok) {
          const errorText = await runResponse.text();
          console.error('Failed to run assistant:', errorText);
          throw new Error(`Failed to run assistant: ${errorText}`);
        }

        const runData = await runResponse.json();
        let runStatus = runData.status;
        let runId = runData.id;
        
        // Poll for completion (with timeout)
        const startTime = Date.now();
        const maxWaitTime = 30000; // 30 seconds max wait
        
        while (runStatus === 'queued' || runStatus === 'in_progress') {
          // Check timeout
          if (Date.now() - startTime > maxWaitTime) {
            throw new Error('Assistant run timed out');
          }
          
          // Wait before polling again
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check run status
          const runCheckResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'OpenAI-Beta': 'assistants=v2'  // Updated beta header
            },
          });
          
          if (!runCheckResponse.ok) {
            const errorText = await runCheckResponse.text();
            console.error('Failed to check run status:', errorText);
            throw new Error(`Failed to check assistant run status: ${errorText}`);
          }
          
          const runCheckData = await runCheckResponse.json();
          runStatus = runCheckData.status;
          
          if (runStatus === 'completed') {
            break;
          } else if (runStatus === 'failed' || runStatus === 'cancelled' || runStatus === 'expired') {
            throw new Error(`Assistant run ${runStatus}`);
          }
        }
        
        // Get messages (the response)
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'OpenAI-Beta': 'assistants=v2'  // Updated beta header
          },
        });
        
        if (!messagesResponse.ok) {
          const errorText = await messagesResponse.text();
          console.error('Failed to get messages:', errorText);
          throw new Error(`Failed to get assistant messages: ${errorText}`);
        }
        
        const messagesData = await messagesResponse.json();
        // Get the last assistant message
        const assistantMessages = messagesData.data.filter((msg: any) => msg.role === 'assistant');
        
        if (assistantMessages.length === 0) {
          throw new Error('No assistant response received');
        }
        
        const lastMessage = assistantMessages[0].content[0].text.value;
        
        return new Response(
          JSON.stringify({ 
            response: lastMessage,
            usingCustomConfig: !!openAIConfig.apiKey,
            vectorStoreId: vectorStoreId,
            assistantId: assistantId,
            usedAssistant: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
      } catch (assistantError) {
        console.error('Assistant API error:', assistantError);
        // Fall back to regular API call if assistant fails
        console.log('Falling back to standard completion API');
      }
    } 
    // If no assistant but vector store is provided
    else if (vectorStoreId) {
      console.log('No valid assistant available, falling back to standard completion API with system message mentioning vector store');
    }

    // Standard completion API as fallback
    // Create a system message that explicitly instructs the model to use the vector store
    const systemMessage = {
      role: 'system',
      content: `You are an AI Assistant for education. 
      The user is studying "${knowledgeBase}", so focus your responses on this subject.
      ${vectorStoreId ? `Note: I was unable to access the vector store (${vectorStoreId}) directly, so I'm using my general knowledge.` : ''}
      ${assistantId ? `Note: I was unable to use the specialized assistant (${assistantId}), so I'm using my general capabilities.` : ''}
      Provide the most helpful and accurate information you can based on what you know.`
    };

    // Make the API call with the enhanced system message
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          systemMessage,
          ...history,
          { role: 'user', content: message }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      // Provide more helpful error messages based on status code
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Authentication error: Invalid OpenAI API key. Please check your API key and try again.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      } else if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'OpenAI API rate limit exceeded. Please try again later.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      } else if (response.status === 400) {
        return new Response(
          JSON.stringify({ error: 'Bad request to OpenAI API. This might be due to an invalid API key format or other parameter issues.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${response.status}. ${errorText}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const data = await response.json();
    
    // Ensure we have a valid response before trying to access properties
    if (!data || !data.choices || !data.choices.length || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }
    
    return new Response(
      JSON.stringify({ 
        response: data.choices[0].message.content,
        usingCustomConfig: !!openAIConfig.apiKey,
        vectorStoreId: vectorStoreId,
        assistantId: assistantId,
        usedFallback: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
