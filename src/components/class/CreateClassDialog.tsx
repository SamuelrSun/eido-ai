
import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BookOpen, Calendar, Code, SquareCheck, Upload } from "lucide-react";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClassCreate: (classData: ClassData) => void;
}

export interface ClassData {
  title: string;
  description: string;
  color: string;
  enabledWidgets: string[];
  openAIConfig?: {
    apiKey?: string;
    vectorStoreId?: string;
    assistantId?: string;
  };
}

const availableWidgets = [
  {
    id: "flashcards",
    name: "Flashcards",
    description: "Create and study with interactive flashcards",
    path: "/flashcards",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    id: "quizzes",
    name: "Quizzes",
    description: "Test your knowledge with adaptive quizzes",
    path: "/quizzes",
    icon: <SquareCheck className="h-5 w-5" />,
  },
  {
    id: "calendar",
    name: "Calendar",
    description: "Track deadlines, exams and important dates",
    path: "/calendar",
    icon: <Calendar className="h-5 w-5" />,
  },
];

const colorOptions = [
  { value: "blue-500", label: "Blue", className: "bg-blue-500" },
  { value: "green-500", label: "Green", className: "bg-green-500" },
  { value: "red-500", label: "Red", className: "bg-red-500" },
  { value: "yellow-500", label: "Yellow", className: "bg-yellow-500" },
  { value: "purple-500", label: "Purple", className: "bg-purple-500" },
  { value: "pink-500", label: "Pink", className: "bg-pink-500" },
];

export function CreateClassDialog({ open, onOpenChange, onClassCreate }: CreateClassDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("blue-500");
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(["flashcards", "quizzes"]);
  const [isUploading, setIsUploading] = useState(false);
  
  // OpenAI configuration states
  const [openAIApiKey, setOpenAIApiKey] = useState("");
  const [vectorStoreId, setVectorStoreId] = useState("");
  const [assistantId, setAssistantId] = useState("");
  const [showOpenAIConfig, setShowOpenAIConfig] = useState(false);

  const handleToggleWidget = (id: string) => {
    setSelectedWidgets(prev =>
      prev.includes(id) ? prev.filter(widgetId => widgetId !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    
    const classData: ClassData = {
      title,
      description,
      color,
      enabledWidgets: selectedWidgets
    };
    
    // Add OpenAI configuration if any fields are provided
    if (openAIApiKey || vectorStoreId || assistantId) {
      classData.openAIConfig = {
        apiKey: openAIApiKey,
        vectorStoreId: vectorStoreId,
        assistantId: assistantId
      };
    }
    
    onClassCreate(classData);
    
    // Reset form
    setTitle("");
    setDescription("");
    setColor("blue-500");
    setSelectedWidgets(["flashcards", "quizzes"]);
    setOpenAIApiKey("");
    setVectorStoreId("");
    setAssistantId("");
    setShowOpenAIConfig(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form
    setTitle("");
    setDescription("");
    setColor("blue-500");
    setSelectedWidgets(["flashcards", "quizzes"]);
    setOpenAIApiKey("");
    setVectorStoreId("");
    setAssistantId("");
    setShowOpenAIConfig(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Class</DialogTitle>
          <DialogDescription>
            Set up your new class with all the tools you'll need
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="space-y-6 py-2 pr-4">
            {/* Class title and description */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="class-title">Class Title</Label>
                <Input 
                  id="class-title"
                  placeholder="e.g., Introduction to Computer Science" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="class-description">Description (optional)</Label>
                <Textarea 
                  id="class-description"
                  placeholder="Describe what this class is about..." 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            
            {/* Color selection */}
            <div>
              <Label>Class Color</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`w-8 h-8 rounded-full ${option.className} flex items-center justify-center ${color === option.value ? 'ring-2 ring-offset-2 ring-black' : ''}`}
                    onClick={() => setColor(option.value)}
                    aria-label={`Select ${option.label} color`}
                  />
                ))}
              </div>
            </div>
            
            {/* Document upload */}
            <div>
              <Label>Upload Materials (optional)</Label>
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  className="w-full h-20 flex flex-col"
                  onClick={() => setIsUploading(true)}
                >
                  <Upload className="h-6 w-6 mb-2" />
                  <span>Upload course materials, syllabus, etc.</span>
                </Button>
              </div>
            </div>
            
            {/* OpenAI Configuration */}
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  <Label className="text-base font-medium">OpenAI Configuration</Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOpenAIConfig(!showOpenAIConfig)}
                >
                  {showOpenAIConfig ? "Hide" : "Show"}
                </Button>
              </div>
              
              {showOpenAIConfig && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="openai-api-key">OpenAI API Key</Label>
                    <Input 
                      id="openai-api-key"
                      type="password"
                      placeholder="sk-..." 
                      value={openAIApiKey}
                      onChange={(e) => setOpenAIApiKey(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="vector-store-id">Vector Store ID</Label>
                    <Input 
                      id="vector-store-id"
                      placeholder="vs-..." 
                      value={vectorStoreId}
                      onChange={(e) => setVectorStoreId(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="assistant-id">Assistant ID</Label>
                    <Input 
                      id="assistant-id"
                      placeholder="asst-..." 
                      value={assistantId}
                      onChange={(e) => setAssistantId(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Widget selection */}
            <div>
              <Label className="mb-2 block">Select Widgets for this Class</Label>
              <div className="space-y-3">
                {availableWidgets.map(widget => (
                  <WidgetCard
                    key={widget.id}
                    id={widget.id}
                    name={widget.name}
                    description={widget.description}
                    icon={widget.icon}
                    isSelected={selectedWidgets.includes(widget.id)}
                    onToggle={handleToggleWidget}
                  />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="flex justify-between sm:justify-between mt-4 pt-2 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            Create Class
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
