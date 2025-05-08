
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { FileUpload } from "@/components/chat/FileUpload";
import { CalendarEvent } from "@/types/calendar";
import { toast } from "sonner";
import { CLASS_COLORS } from "./ClassFilter";

interface SyllabusUploaderProps {
  onEventsAdded: (events: CalendarEvent[]) => void;
}

export function SyllabusUploader({ onEventsAdded }: SyllabusUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [className, setClassName] = useState("ITP457: Advanced Network Security");

  const handleFileUpload = (uploadedFile: File) => {
    setFile(uploadedFile);
    console.log("File selected:", uploadedFile.name, uploadedFile.type, uploadedFile.size);
  };

  const handleProcessSyllabus = async () => {
    if (!file || !className) {
      toast.error("Please select both a file and a class");
      return;
    }

    setIsProcessing(true);
    console.log(`Processing syllabus: ${file.name} for class: ${className}`);
    
    try {
      // Create form data to send to our edge function
      const formData = new FormData();
      formData.append('file', file);
      formData.append('className', className);
      
      console.log("Sending request to process-syllabus edge function");
      
      // Call our edge function to process the syllabus
      const response = await fetch(
        `https://uzdtqomtbrccinrkhzme.functions.supabase.co/process-syllabus`, 
        {
          method: 'POST',
          body: formData,
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response from edge function:", response.status, errorData);
        throw new Error(errorData.error || `Failed to process syllabus (Status: ${response.status})`);
      }
      
      const data = await response.json();
      console.log("Response from edge function:", data);
      
      if (!data.events || !Array.isArray(data.events)) {
        console.error("Invalid events data structure:", data);
        throw new Error('Invalid response from syllabus processing');
      }
      
      if (data.events.length === 0) {
        toast.warning("No events found in the syllabus");
        setFile(null);
        return;
      }
      
      // Convert the extracted events to the CalendarEvent format
      const extractedEvents: CalendarEvent[] = data.events.map((event: any) => {
        // Ensure date is valid
        let eventDate: Date;
        try {
          eventDate = new Date(event.date);
          
          // Check if date is valid
          if (isNaN(eventDate.getTime())) {
            console.warn("Invalid date detected:", event.date);
            // Fallback to current date
            eventDate = new Date();
          }
        } catch (error) {
          console.error("Error parsing date:", error, event);
          // Fallback to current date
          eventDate = new Date();
        }
        
        return {
          id: crypto.randomUUID(),
          title: event.title || "Untitled Event",
          description: event.description || `From ${file.name}`,
          date: eventDate,
          className,
          color: CLASS_COLORS[className as keyof typeof CLASS_COLORS] || "#9b87f5"
        };
      });
      
      console.log(`Successfully extracted ${extractedEvents.length} events from syllabus`);
      onEventsAdded(extractedEvents);
      toast.success(`Successfully extracted ${extractedEvents.length} events from syllabus`);
      
      // Reset
      setFile(null);
    } catch (error) {
      console.error("Error processing syllabus:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process syllabus. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-3">Upload Syllabus</h2>
      <div className="mb-3">
        <select
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          className="w-full rounded-md border border-gray-300 p-2 text-sm"
        >
          {Object.keys(CLASS_COLORS).map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex gap-2 items-center mt-auto">
        <div className="flex-1">
          <FileUpload onFileUpload={handleFileUpload} compact />
        </div>
        
        <Button
          onClick={handleProcessSyllabus}
          disabled={!file || isProcessing}
          size="sm"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-3 w-3 mr-1" />
              Process
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
