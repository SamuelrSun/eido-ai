// supabase/functions/parse-syllabus/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import * as pdfjs from 'npm:pdfjs-dist@4.4.168/legacy/build/pdf.mjs';

// Helper function to decode base64 string to a Uint8Array
const base64ToUint8Array = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("[INFO] 'parse-syllabus' function invoked.");
    const { files, class_id } = await req.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      console.error("[ERROR] No files provided in the request.");
      throw new Error('No files provided for parsing.');
    }
    if (!class_id) {
      console.error("[ERROR] No class_id provided in the request.");
      throw new Error('A class must be selected.');
    }
    console.log(`[INFO] Received ${files.length} files for class_id: ${class_id}`);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("[ERROR] OPENAI_API_KEY environment variable is not set.");
      throw new Error("OPENAI_API_KEY is not set in environment variables.");
    }
    console.log("[INFO] OpenAI API key found.");
    
    // Define the type for the parts of the multimodal content
    type ContentPart = 
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } };

    // Explicitly type the 'userContent' array
    const userContent: ContentPart[] = [
      {
        type: "text",
        text: `
          You are an expert academic assistant specializing in parsing course syllabi.
          Analyze the following file(s) (which could be text from documents or screenshots of a syllabus) and extract all calendar-worthy events.
          For each event, identify its title, type, start date, and start time.
          The possible event types are: 'assignment', 'exam', or 'event'.
          If you cannot determine a specific detail (like the time), return null for that field.
          Be meticulous and accurate. The user is relying on you to build their schedule.
          Return the data in a valid JSON object with a single key "events" which is an array of the extracted event objects.
          Each event object must have the following properties: "title" (string), "event_type" (string: 'assignment', 'exam', or 'event'), "date" (string: "YYYY-MM-DD" or null), "time" (string: "HH:MM" 24-hour format or null), "location" (string or null), "notes" (string or null).
        `,
      },
    ];

    let processedFileCount = 0;
    for (const file of files) {
      if (file.type && file.type.startsWith('image/')) {
        userContent.push({
          type: "image_url",
          image_url: {
            "url": `data:${file.type};base64,${file.content}`
          }
        });
        processedFileCount++;
        console.log(`[INFO] Added image file to prompt: ${file.name}`);
      } else if (file.type === 'application/pdf') {
        console.log(`[INFO] Processing PDF file: ${file.name}`);
        const pdfData = base64ToUint8Array(file.content);
        const pdfDoc = await pdfjs.getDocument(pdfData).promise;
        let fullText = '';
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n\n';
        }
        userContent.push({ type: 'text', text: `--- PDF Content from ${file.name} ---\n${fullText}` });
        processedFileCount++;
        console.log(`[INFO] Extracted and added text from PDF: ${file.name}`);
      } else {
        console.log(`[WARN] Skipping unsupported file type: ${file.name} (type: ${file.type})`);
      }
    }

    if (processedFileCount === 0) {
      console.error("[ERROR] No processable files found in the upload (only PNG, JPG, and PDF are supported).");
      throw new Error("No processable files found. Please upload syllabus screenshots (PNG, JPG) or PDF documents.");
    }
    console.log(`[INFO] Prepared ${processedFileCount} file(s) for OpenAI API.`);

    const payload = {
      model: "gpt-4o", // Use the more advanced gpt-4o model
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
      max_tokens: 3000,
      response_format: { type: "json_object" },
    };

    console.log("[INFO] Sending request to OpenAI API...");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ERROR] OpenAI API request failed with status ${response.status}: ${errorText}`);
        throw new Error(`OpenAI API request failed: ${errorText}`);
    }
    console.log("[INFO] Successfully received response from OpenAI API.");

    const result = await response.json();
    const responseText = result.choices[0].message.content;
    const parsedEvents = JSON.parse(responseText);
    console.log("[INFO] Successfully parsed JSON response from AI.");

    return new Response(JSON.stringify(parsedEvents), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("[FATAL] An error occurred in the function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});