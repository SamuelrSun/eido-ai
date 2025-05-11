
import React, { useState, useEffect } from "react";
import { BookOpen, SquareCheck } from "lucide-react";
import { ClassInfoSection } from "./ClassInfoSection";
import { OpenAIConfigSection } from "./OpenAIConfigSection";
import { WidgetSelectionSection } from "./WidgetSelectionSection";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClassData } from "../CreateClassDialog";
import { classOpenAIConfigService } from "@/services/classOpenAIConfig";
import { getEmojiForClass } from "@/utils/emojiUtils";
import { EmojiPicker } from "./EmojiPicker";
import { supabase } from "@/integrations/supabase/client";

interface CreateClassDialogContentProps {
  onClassCreate: (classData: ClassData) => void;
  onCancel: () => void;
  initialData?: ClassData;
  isEditing?: boolean;
}

// Interface for database row response
interface ClassOpenAIConfigRow {
  api_key: string;
  assistant_id: string;
  class_time: string;
  class_title: string;
  classroom: string;
  created_at: string;
  emoji: string;
  id: string;
  professor: string;
  updated_at: string;
  user_id: string;
  vector_store_id: string;
  enabled_widgets?: string[]; // Added to match database column
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
  }
];

export function CreateClassDialogContent({ onClassCreate, onCancel, initialData, isEditing = false }: CreateClassDialogContentProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [professor, setProfessor] = useState(initialData?.professor || "");
  const [classTime, setClassTime] = useState(initialData?.classTime || "");
  const [classroom, setClassroom] = useState(initialData?.classroom || "");
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
  const [user, setUser] = useState<any>(null);

  console.log("Initial emoji:", initialData?.emoji);
  console.log("Current emoji state:", emoji);

  // Check for authenticated user
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    
    checkAuth();
  }, []);

  // Fetch config from Supabase when editing
  useEffect(() => {
    const fetchConfig = async () => {
      if (initialData && isEditing && initialData.title && user) {
        try {
          const config = await classOpenAIConfigService.getConfigForClass(initialData.title);
          if (config) {
            setOpenAIApiKey(config.apiKey || "");
            setVectorStoreId(config.vectorStoreId || "");
            setAssistantId(config.assistantId || "");
            setShowOpenAIConfig(true);
          }
          
          // Fetch the class record to get any other data
          const { data, error } = await supabase
            .from('class_openai_configs')
            .select('*')
            .eq('class_title', initialData.title)
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (!error && data) {
            // Cast data as our enhanced interface
            const configData = data as ClassOpenAIConfigRow;
            
            // Set data from database
            setEmoji(configData.emoji || initialData.emoji || "");
            setProfessor(configData.professor || initialData.professor || "");
            setClassTime(configData.class_time || initialData.classTime || "");
            setClassroom(configData.classroom || initialData.classroom || "");
            
            // For enabled_widgets, we need to handle it differently since it might not exist in the database schema
            const enabledWidgets = configData.enabled_widgets || initialData.enabledWidgets || ["flashcards", "quizzes"];
            setSelectedWidgets(Array.isArray(enabledWidgets) ? enabledWidgets : ["flashcards", "quizzes"]);
          }
        } catch (error) {
          console.error("Error fetching OpenAI config:", error);
        }
      }
    };
    
    fetchConfig();
  }, [initialData, isEditing, user]);

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
    if (!title) return;
    
    const classData: ClassData = {
      title,
      professor,
      classTime,
      classroom,
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
    
    // If user is authenticated and in edit mode, also save to database
    if (user && isEditing && title) {
      classOpenAIConfigService.saveConfigForClass(
        title, 
        classData.openAIConfig || {}, 
        emoji,
        professor,
        classTime,
        classroom,
        selectedWidgets
      ).catch(error => {
        console.error("Error saving class config:", error);
      });
    }
  }, [title, professor, classTime, classroom, selectedWidgets, emoji, openAIApiKey, vectorStoreId, assistantId, onClassCreate, user, isEditing]);

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
