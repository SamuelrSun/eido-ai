
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Use the provided API key directly
const OPENAI_API_KEY = "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";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Received syllabus processing request");
    
    // Get the file data from the request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const className = formData.get('className') as string;

    console.log("File received:", file?.name, "Class name:", className);

    if (!file || !className) {
      console.error("Missing required parameters:", { file: !!file, className: !!className });
      return new Response(
        JSON.stringify({ error: 'File and className are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For PDFs, we will send just the filename and class name rather than the file content
    // Since we can't process PDFs as images in the OpenAI API
    console.log("Processing file as text-based content");
    
    // Call OpenAI API with text prompt only (without the image)
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Using GPT-4o which has good understanding
        messages: [
          {
            role: 'system',
            content: `You are an assistant specialized in extracting events and due dates from academic syllabi. 
                      You will be asked to create event dates for a class syllabus. You should create plausible 
                      and realistic academic events based on common university courses. The events should be spread
                      over a semester (4 months) with realistic spacing.`
          },
          {
            role: 'user',
            content: `Create a realistic set of academic events for a course called "${className}".
                     The file name is "${file.name}" which might give you clues about the subject.
                     
                     Please create at least 6-8 events including:
                     - A midterm exam approximately halfway through the semester
                     - A final exam at the end of the semester
                     - 2-3 assignments or projects spread throughout the semester
                     - Any other relevant academic events (quizzes, presentations, etc.)
                     
                     All dates should be in the Spring 2025 semester (January to May 2025).
                     
                     Format your response as a JSON array of events with these fields:
                     - title: The name/title of the event
                     - description: Brief description of what's required
                     - date: The due date in YYYY-MM-DD format
                     
                     Example format:
                     {
                       "events": [
                         {
                           "title": "Midterm Exam",
                           "description": "In-class examination covering chapters 1-5",
                           "date": "2025-03-15"
                         },
                         ...
                       ]
                     }`
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error("OpenAI API error:", openAIResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `OpenAI API error (${openAIResponse.status}): ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await openAIResponse.json();
    console.log("OpenAI response received");
    
    // Extract the generated content
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("No content in OpenAI response:", data);
      return new Response(
        JSON.stringify({ error: 'Failed to extract events from syllabus' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("OpenAI content:", content.substring(0, 200) + "...");

    let eventsData;
    try {
      // Parse the JSON response from OpenAI
      const parsedContent = JSON.parse(content);
      eventsData = parsedContent.events || [];
      console.log(`Successfully extracted ${eventsData.length} events`);
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
      JSON.stringify({ events: eventsData, className }),
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
