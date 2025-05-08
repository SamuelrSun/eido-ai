
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the file data from the request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const className = formData.get('className') as string;

    if (!file || !className) {
      return new Response(
        JSON.stringify({ error: 'File and className are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert file to base64 for OpenAI API
    const fileBuffer = await file.arrayBuffer();
    const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Using GPT-4o which has good image/document understanding
        messages: [
          {
            role: 'system',
            content: 'You are an assistant specialized in extracting events and due dates from academic syllabi. Extract all assignment deadlines, exam dates, project due dates, and other important events.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all academic events from this syllabus. The class name is: ${className}. 
                Please format your response as a JSON array of events with these fields:
                - title: The name/title of the event
                - description: Brief description of what's required
                - date: The due date in YYYY-MM-DD format
                
                Example format:
                [
                  {
                    "title": "Midterm Exam",
                    "description": "In-class examination covering chapters 1-5",
                    "date": "2025-03-15"
                  },
                  ...
                ]
                
                Only include events with clear dates. If a date range is provided, use the due date or end date.`
              },
              {
                type: 'file_content',
                file_id: {
                  file_data: fileBase64
                }
              }
            ]
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    
    // Extract the generated content
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Failed to extract events from syllabus' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let events;
    try {
      // Parse the JSON response from OpenAI
      const parsedContent = JSON.parse(content);
      events = Array.isArray(parsedContent.events) ? parsedContent.events : parsedContent;
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      console.log('Raw content:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse events from API response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Return the extracted events
    return new Response(
      JSON.stringify({ events, className }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing syllabus:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
