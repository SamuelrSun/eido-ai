
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

    // If vector store ID is provided, use the retrievals API to enhance with context from the vector store
    if (vectorStoreId) {
      try {
        // First step: Make a retrieval request to the vector store
        const retrievalResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: message,
            limit: 5,  // Retrieve top 5 most relevant chunks
          }),
        });

        if (!retrievalResponse.ok) {
          console.error('Vector store retrieval failed:', await retrievalResponse.text());
          throw new Error('Failed to retrieve context from vector store');
        }

        const retrievalData = await retrievalResponse.json();
        
        console.log(`Retrieved ${retrievalData.data?.length || 0} context items from vector store`);
        
        // Build enhanced system message with retrieved context
        let contextContent = '';
        if (retrievalData.data && retrievalData.data.length > 0) {
          contextContent = retrievalData.data.map((item: any, index: number) => 
            `Context ${index + 1}:\n${item.text}`
          ).join('\n\n');
        }
        
        // Create a system message with the retrieved context
        const systemMessage = {
          role: 'system',
          content: `You are an AI Assistant for ${knowledgeBase} education.
          
          Here's relevant information from the class materials:
          ${contextContent || "No specific context found. Use your general knowledge."}
          
          Answer the user's question using this context. If the context doesn't contain enough information to provide a complete answer, acknowledge that and provide your best response based on your general knowledge while being clear about which parts come from the class materials and which don't.`
        };

        // Now make the completion request with the enhanced context
        const completionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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

        if (!completionResponse.ok) {
          const errorText = await completionResponse.text();
          console.error('OpenAI API error:', completionResponse.status, errorText);
          throw new Error(`OpenAI API error: ${completionResponse.status}. ${errorText}`);
        }

        const completionData = await completionResponse.json();
        
        return new Response(
          JSON.stringify({ 
            response: completionData.choices[0].message.content,
            usingCustomConfig: !!openAIConfig.apiKey,
            vectorStoreId: vectorStoreId,
            assistantId: assistantId,
            usedVectorStore: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (vectorStoreError) {
        console.error('Vector store processing error:', vectorStoreError);
        // Fall back to regular API call if vector store fails
        console.log('Falling back to standard completion API');
      }
    } 
    
    // If assistant ID is provided and we're not already using vector store, use the assistant
    if (assistantId && !vectorStoreId) {
      try {
        // Create a thread
        const threadResponse = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v1'
          },
          body: JSON.stringify({}),
        });

        if (!threadResponse.ok) {
          console.error('Failed to create thread:', await threadResponse.text());
          throw new Error('Failed to create assistant thread');
        }

        const threadData = await threadResponse.json();
        const threadId = threadData.id;
        
        // Add message to thread
        const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v1'
          },
          body: JSON.stringify({
            role: 'user',
            content: message
          }),
        });

        if (!messageResponse.ok) {
          console.error('Failed to add message:', await messageResponse.text());
          throw new Error('Failed to add message to thread');
        }

        // Run the assistant
        const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v1'
          },
          body: JSON.stringify({
            assistant_id: assistantId
          }),
        });

        if (!runResponse.ok) {
          console.error('Failed to run assistant:', await runResponse.text());
          throw new Error('Failed to run assistant');
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
              'OpenAI-Beta': 'assistants=v1'
            },
          });
          
          if (!runCheckResponse.ok) {
            console.error('Failed to check run status:', await runCheckResponse.text());
            throw new Error('Failed to check assistant run status');
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
            'OpenAI-Beta': 'assistants=v1'
          },
        });
        
        if (!messagesResponse.ok) {
          console.error('Failed to get messages:', await messagesResponse.text());
          throw new Error('Failed to get assistant messages');
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
            vectorStoreId: null,
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
