
import React, { useState, useEffect } from "react";
import { BookOpen, Calendar, Code, SquareCheck } from "lucide-react";
import { ClassInfoSection } from "./ClassInfoSection";
import { ColorSelectionSection } from "./ColorSelectionSection";
import { MaterialsUploadSection } from "./MaterialsUploadSection";
import { OpenAIConfigSection } from "./OpenAIConfigSection";
import { WidgetSelectionSection } from "./WidgetSelectionSection";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClassData } from "../CreateClassDialog";
import { classOpenAIConfigService } from "@/services/classOpenAIConfig";

interface CreateClassDialogContentProps {
  onClassCreate: (classData: ClassData) => void;
  onCancel: () => void;
  initialData?: ClassData;
  isEditing?: boolean;
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

export function CreateClassDialogContent({ onClassCreate, onCancel, initialData, isEditing = false }: CreateClassDialogContentProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [color, setColor] = useState(initialData?.color || "blue-500");
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(initialData?.enabledWidgets || ["flashcards", "quizzes"]);
  const [isUploading, setIsUploading] = useState(false);
  
  // OpenAI configuration states
  const [openAIApiKey, setOpenAIApiKey] = useState(initialData?.openAIConfig?.apiKey || "");
  const [vectorStoreId, setVectorStoreId] = useState(initialData?.openAIConfig?.vectorStoreId || "");
  const [assistantId, setAssistantId] = useState(initialData?.openAIConfig?.assistantId || "");
  const [showOpenAIConfig, setShowOpenAIConfig] = useState(
    isEditing ? !!(initialData?.openAIConfig?.apiKey || initialData?.openAIConfig?.vectorStoreId || initialData?.openAIConfig?.assistantId) : false
  );

  // Update values when initialData changes (important for edit mode)
  useEffect(() => {
    if (initialData && isEditing) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setColor(initialData.color || "blue-500");
      setSelectedWidgets(initialData.enabledWidgets || ["flashcards", "quizzes"]);
      setOpenAIApiKey(initialData.openAIConfig?.apiKey || "");
      setVectorStoreId(initialData.openAIConfig?.vectorStoreId || "");
      setAssistantId(initialData.openAIConfig?.assistantId || "");
      setShowOpenAIConfig(!!(initialData.openAIConfig?.apiKey || initialData.openAIConfig?.vectorStoreId || initialData.openAIConfig?.assistantId));
    }
  }, [initialData, isEditing]);

  // Update parent component whenever form data changes
  useEffect(() => {
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

      // Also save this config to our service for future use
      if (title) {
        classOpenAIConfigService.saveConfigForClass(title, classData.openAIConfig);
      }
    }
    
    onClassCreate(classData);
  }, [title, description, color, selectedWidgets, openAIApiKey, vectorStoreId, assistantId, onClassCreate]);

  const handleToggleWidget = (id: string) => {
    setSelectedWidgets(prev =>
      prev.includes(id) ? prev.filter(widgetId => widgetId !== id) : [...prev, id]
    );
  };

  const handleUpload = () => {
    setIsUploading(true);
    // Upload functionality would be implemented here
  };

  return (
    <ScrollArea className="max-h-[calc(90vh-180px)]">
      <div className="space-y-6 py-2 pr-4">
        {/* Class title and description */}
        <ClassInfoSection 
          title={title}
          description={description}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
        />
        
        {/* Color selection */}
        <ColorSelectionSection 
          color={color}
          colorOptions={colorOptions}
          onColorChange={setColor}
        />
        
        {/* Document upload */}
        <MaterialsUploadSection onUpload={handleUpload} />
        
        {/* OpenAI Configuration */}
        <OpenAIConfigSection 
          openAIApiKey={openAIApiKey}
          vectorStoreId={vectorStoreId}
          assistantId={assistantId}
          showOpenAIConfig={showOpenAIConfig}
          onApiKeyChange={setOpenAIApiKey}
          onVectorStoreIdChange={setVectorStoreId}
          onAssistantIdChange={setAssistantId}
          onToggleConfig={() => setShowOpenAIConfig(!showOpenAIConfig)}
        />
        
        {/* Widget selection */}
        <WidgetSelectionSection 
          selectedWidgets={selectedWidgets}
          availableWidgets={availableWidgets}
          onToggleWidget={handleToggleWidget}
        />
      </div>
    </ScrollArea>
  );
}
