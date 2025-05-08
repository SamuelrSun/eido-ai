
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { FileUpload } from "@/components/chat/FileUpload";
import { CalendarEvent } from "@/types/calendar";
import { toast } from "sonner";

const CLASS_COLORS = {
  "ITP457: Advanced Network Security": "#9b87f5",
  "ITP216: Applied Python Concepts": "#0EA5E9",
  "IR330: Politics of the World Economy": "#F97316"
};

interface SyllabusUploaderProps {
  onEventsAdded: (events: CalendarEvent[]) => void;
}

export function SyllabusUploader({ onEventsAdded }: SyllabusUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [className, setClassName] = useState("ITP457: Advanced Network Security");

  const handleFileUpload = (uploadedFile: File) => {
    setFile(uploadedFile);
  };

  const handleProcessSyllabus = async () => {
    if (!file) return;

    setIsProcessing(true);
    
    try {
      // In a real implementation, we would send the file to an API endpoint
      // that would process the syllabus using OpenAI and return events
      
      // For now, we'll simulate this with a timeout and mock data
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock extracted events
      const mockEvents: CalendarEvent[] = [
        {
          id: crypto.randomUUID(),
          title: "Reading Assignment: Chapter 5",
          description: `From ${file.name}`,
          date: new Date(2025, 4, 18),
          className,
          color: CLASS_COLORS[className as keyof typeof CLASS_COLORS]
        },
        {
          id: crypto.randomUUID(),
          title: "Quiz 2",
          description: `From ${file.name}`,
          date: new Date(2025, 4, 22),
          className,
          color: CLASS_COLORS[className as keyof typeof CLASS_COLORS]
        },
        {
          id: crypto.randomUUID(),
          title: "Final Paper Submission",
          description: `From ${file.name}`,
          date: new Date(2025, 5, 5),
          className,
          color: CLASS_COLORS[className as keyof typeof CLASS_COLORS]
        }
      ];
      
      onEventsAdded(mockEvents);
      toast.success(`Successfully extracted ${mockEvents.length} events from syllabus`);
      
      // Reset
      setFile(null);
    } catch (error) {
      console.error("Error processing syllabus:", error);
      toast.error("Failed to process syllabus. Please try again.");
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
          <option value="ITP457: Advanced Network Security">
            ITP457: Advanced Network Security
          </option>
          <option value="ITP216: Applied Python Concepts">
            ITP216: Applied Python Concepts
          </option>
          <option value="IR330: Politics of the World Economy">
            IR330: Politics of the World Economy
          </option>
        </select>
      </div>
      
      <div className="flex gap-2 items-center mt-auto">
        <div className="flex-1">
          <FileUpload onFileUpload={handleFileUpload} />
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
