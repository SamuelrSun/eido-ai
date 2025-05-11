import React, { useState, useEffect } from "react";
import { BookOpen, SquareCheck } from "lucide-react";
import { ClassInfoSection } from "./ClassInfoSection";
import { ColorSelectionSection } from "./ColorSelectionSection";
import { OpenAIConfigSection } from "./OpenAIConfigSection";
import { WidgetSelectionSection } from "./WidgetSelectionSection";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClassData } from "../CreateClassDialog";
import { classOpenAIConfigService } from "@/services/classOpenAIConfig";
import { getEmojiForClass } from "@/utils/emojiUtils";
import { EmojiPicker } from "./EmojiPicker";

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
];

// Updated pastel and sophisticated color options
const colorOptions = [
  { value: "blue-300", label: "Blue", className: "bg-blue-300" },
  { value: "emerald-300", label: "Emerald", className: "bg-emerald-300" },
  { value: "rose-300", label: "Rose", className: "bg-rose-300" },
  { value: "amber-200", label: "Amber", className: "bg-amber-200" },
  { value: "violet-300", label: "Violet", className: "bg-violet-300" },
  { value: "indigo-300", label: "Indigo", className: "bg-indigo-300" },
];

export function CreateClassDialogContent({ onClassCreate, onCancel, initialData, isEditing = false }: CreateClassDialogContentProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [professor, setProfessor] = useState(initialData?.professor || "");
  const [classTime, setClassTime] = useState(initialData?.classTime || "");
  const [classroom, setClassroom] = useState(initialData?.classroom || "");
  const [color, setColor] = useState(initialData?.color || "blue-300");
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(initialData?.enabledWidgets || ["flashcards", "quizzes"]);
  const [emoji, setEmoji] = useState(initialData?.emoji || "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // OpenAI configuration states
  const [openAIApiKey, setOpenAIApiKey] = useState(initialData?.openAIConfig?.apiKey || "");
  const [vectorStoreId, setVectorStoreId] = useState(initialData?.openAIConfig?.vectorStoreId || "");
  const [assistantId, setAssistantId] = useState(initialData?.openAIConfig?.assistantId || "");
  const [showOpenAIConfig, setShowOpenAIConfig] = useState(
    isEditing ? !!(initialData?.openAIConfig?.apiKey || initialData?.openAIConfig?.vectorStoreId || initialData?.openAIConfig?.assistantId) : false
  );

  console.log("Initial emoji:", initialData?.emoji);
  console.log("Current emoji state:", emoji);

  // Fetch config from Supabase when editing
  useEffect(() => {
    const fetchConfig = async () => {
      if (initialData && isEditing && initialData.title) {
        try {
          const config = await classOpenAIConfigService.getConfigForClass(initialData.title);
          if (config) {
            setOpenAIApiKey(config.apiKey || "");
            setVectorStoreId(config.vectorStoreId || "");
            setAssistantId(config.assistantId || "");
            setShowOpenAIConfig(true);
          }
        } catch (error) {
          console.error("Error fetching OpenAI config:", error);
        }
      }
    };
    
    fetchConfig();
  }, [initialData, isEditing]);

  // Set default emoji only for new classes and only if no emoji is explicitly set
  useEffect(() => {
    if (title && !emoji && !isEditing) {
      const generatedEmoji = getEmojiForClass(title);
      console.log(`Generated emoji for ${title}:`, generatedEmoji);
      setEmoji(generatedEmoji);
    }
  }, [title, emoji, isEditing]);

  // Update values when initialData changes (important for edit mode)
  useEffect(() => {
    if (initialData) {
      console.log("Setting initial data:", initialData);
      setTitle(initialData.title || "");
      setProfessor(initialData.professor || "");
      setClassTime(initialData.classTime || "");
      setClassroom(initialData.classroom || "");
      setColor(initialData.color || "blue-300");
      setSelectedWidgets(initialData.enabledWidgets || ["flashcards", "quizzes"]);
      setOpenAIApiKey(initialData.openAIConfig?.apiKey || "");
      setVectorStoreId(initialData.openAIConfig?.vectorStoreId || "");
      setAssistantId(initialData.openAIConfig?.assistantId || "");
      setEmoji(initialData.emoji || "");
      setShowOpenAIConfig(!!(initialData.openAIConfig?.apiKey || initialData.openAIConfig?.vectorStoreId || initialData.openAIConfig?.assistantId));
    }
  }, [initialData]);

  // Update parent component whenever form data changes
  useEffect(() => {
    const updateClassData = async () => {
      const classData: ClassData = {
        title,
        professor,
        classTime,
        classroom,
        color,
        enabledWidgets: selectedWidgets,
        emoji
      };
      
      // Add OpenAI configuration if any fields are provided
      if (openAIApiKey || vectorStoreId || assistantId) {
        classData.openAIConfig = {
          apiKey: openAIApiKey,
          vectorStoreId: vectorStoreId,
          assistantId: assistantId
        };
      }
      
      console.log("Updating class data:", classData);
      onClassCreate(classData);
    };
    
    updateClassData();
  }, [title, professor, classTime, classroom, color, selectedWidgets, emoji, openAIApiKey, vectorStoreId, assistantId, onClassCreate]);

  const handleToggleWidget = (id: string) => {
    setSelectedWidgets(prev =>
      prev.includes(id) ? prev.filter(widgetId => widgetId !== id) : [...prev, id]
    );
  };

  const handleSelectEmoji = (selectedEmoji: string) => {
    console.log("Selected emoji:", selectedEmoji);
    setEmoji(selectedEmoji);
    setShowEmojiPicker(false);
  };

  return (
    <ScrollArea className="max-h-[calc(90vh-180px)]">
      <div className="space-y-6 py-2 pr-4">
        {/* Class title and information */}
        <ClassInfoSection 
          title={title}
          professor={professor}
          classTime={classTime}
          classroom={classroom}
          emoji={emoji}
          onTitleChange={setTitle}
          onProfessorChange={setProfessor}
          onClassTimeChange={setClassTime}
          onClassroomChange={setClassroom}
          onEmojiChange={setEmoji}
          onEmojiPickerOpen={() => setShowEmojiPicker(true)}
        />
        
        {/* Color selection */}
        <ColorSelectionSection 
          color={color}
          colorOptions={colorOptions}
          onColorChange={setColor}
        />
        
        {/* Emoji Picker Dialog */}
        {showEmojiPicker && (
          <EmojiPicker 
            open={showEmojiPicker}
            onOpenChange={setShowEmojiPicker}
            onSelect={handleSelectEmoji}
          />
        )}
        
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
