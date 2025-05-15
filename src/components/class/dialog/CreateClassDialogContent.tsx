// src/components/class/dialog/CreateClassDialogContent.tsx
import React, { useState, useEffect, useCallback } from "react";
import { BookOpen, SquareCheck, Search, Database as DatabaseIcon } from "lucide-react"; // Renamed Database to DatabaseIcon
import { ClassInfoSection } from "./ClassInfoSection";
// import { OpenAIConfigSection } from "./OpenAIConfigSection"; // OpenAIConfigSection is no longer used
import { WidgetSelectionSection } from "./WidgetSelectionSection";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClassData } from "../CreateClassDialog"; // This ClassData should be the one from CreateClassDialog.tsx
import { classOpenAIConfigService, OpenAIConfig as ServiceOpenAIConfig } from "@/services/classOpenAIConfig";
import { getEmojiForClass } from "@/utils/emojiUtils";
import { EmojiPicker } from "./EmojiPicker";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { WidgetType } from "@/hooks/use-widgets"; // Import WidgetType

// Interface for the structure of rows from the 'classes' table
// This should align with your CustomDatabase['public']['Tables']['classes']['Row']
interface ClassesDBRow {
  class_id: string;
  class_title: string;
  professor?: string | null;
  class_time?: string | null;
  classroom?: string | null;
  vector_store_id?: string | null;
  assistant_id?: string | null;
  user_id?: string | null;
  emoji?: string | null;
  enabled_widgets?: string[] | null; // Supabase stores text arrays as string[]
  created_at?: string | null;
  updated_at?: string | null;
}

// Define available widgets (should ideally come from a central place if used elsewhere)
const availableWidgets = [
  {
    id: "supertutor" as WidgetType, // Ensure these IDs match WidgetType
    name: "Super Tutor",
    description: "AI-powered learning assistant",
    path: "/super-stu", // Ensure paths are correct
    icon: <Search className="h-5 w-5" />,
  },
  {
    id: "database" as WidgetType,
    name: "Database",
    description: "Store and manage your files",
    path: "/database",
    icon: <DatabaseIcon className="h-5 w-5" />,
  },
  {
    id: "flashcards" as WidgetType,
    name: "Flashcards",
    description: "Create and study with interactive flashcards",
    path: "/flashcards",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    id: "quizzes" as WidgetType,
    name: "Quizzes",
    description: "Test your knowledge with adaptive quizzes",
    path: "/quizzes",
    icon: <SquareCheck className="h-5 w-5" />,
  }
];

// Default widgets for a new class
const DEFAULT_CLASS_WIDGETS: WidgetType[] = ["supertutor", "database"];

interface CreateClassDialogContentProps {
  onClassCreate: (classData: ClassData) => void;
  onCancel: () => void;
  initialData?: Partial<ClassData & { class_id?: string }>; 
  isEditing?: boolean;
}

export function CreateClassDialogContent({
  onClassCreate,
  initialData,
  isEditing = false
}: CreateClassDialogContentProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [professor, setProfessor] = useState(initialData?.professor || "");
  const [classTime, setClassTime] = useState(initialData?.classTime || "");
  const [classroom, setClassroom] = useState(initialData?.classroom || "");
  const [selectedWidgets, setSelectedWidgets] = useState<WidgetType[]>(
    (initialData?.enabledWidgets as WidgetType[]) || DEFAULT_CLASS_WIDGETS
  );
  const [emoji, setEmoji] = useState(initialData?.emoji || "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // OpenAI configuration states - These are kept for data integrity but not displayed for editing
  const [vectorStoreId, setVectorStoreId] = useState(initialData?.openAIConfig?.vectorStoreId || "");
  const [assistantId, setAssistantId] = useState(initialData?.openAIConfig?.assistantId || "");
  // const [showOpenAIConfig, setShowOpenAIConfig] = useState(false); // REMOVED: No longer needed as the section is removed

  const [user, setUser] = useState<User | null>(null);

  // Fetch authenticated user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // Populate form when in editing mode and initialData or user changes
  useEffect(() => {
    if (isEditing && initialData && user) {
      setTitle(initialData.title || "");
      setProfessor(initialData.professor || "");
      setClassTime(initialData.classTime || "");
      setClassroom(initialData.classroom || "");
      setEmoji(initialData.emoji || getEmojiForClass(initialData.title || ""));
      setSelectedWidgets((initialData.enabledWidgets as WidgetType[]) || DEFAULT_CLASS_WIDGETS);

      // For OpenAI config, if initialData has it, use it.
      // Otherwise, if we have a class_id, try to fetch the latest from DB.
      // These IDs are auto-provisioned and not user-editable in the UI anymore.
      if (initialData.openAIConfig) {
        setVectorStoreId(initialData.openAIConfig.vectorStoreId || "");
        setAssistantId(initialData.openAIConfig.assistantId || "");
        // setShowOpenAIConfig(!!(initialData.openAIConfig.vectorStoreId || initialData.openAIConfig.assistantId)); // REMOVED
      } else if (initialData.class_id) {
        classOpenAIConfigService.getConfigForClass(initialData.class_id)
          .then(config => {
            if (config) {
              setVectorStoreId(config.vectorStoreId || "");
              setAssistantId(config.assistantId || "");
              // setShowOpenAIConfig(!!(config.vectorStoreId || config.assistantId)); // REMOVED
            }
          })
          .catch(err => console.error("Error fetching specific class config for edit:", err));
      }
    } else if (!isEditing) {
      // Reset for new class form
      setTitle("");
      setProfessor("");
      setClassTime("");
      setClassroom("");
      setEmoji(getEmojiForClass(""));
      setSelectedWidgets(DEFAULT_CLASS_WIDGETS);
      setVectorStoreId("");
      setAssistantId("");
      // setShowOpenAIConfig(false); // REMOVED
    }
  }, [initialData, isEditing, user]);


  // Set default emoji for new classes if title changes and no emoji is set
  useEffect(() => {
    if (title && !emoji && !isEditing) {
      setEmoji(getEmojiForClass(title));
    }
  }, [title, emoji, isEditing]);

  // Debounced effect to call onClassCreate (parent's handleFormDataChange)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (title || isEditing) { 
        const currentClassData: ClassData = {
          title,
          professor: professor || null,
          classTime: classTime || null,
          classroom: classroom || null,
          enabledWidgets: selectedWidgets.length > 0 ? selectedWidgets : DEFAULT_CLASS_WIDGETS,
          emoji: emoji || getEmojiForClass(title),
          openAIConfig: { 
            vectorStoreId: vectorStoreId || null,
            assistantId: assistantId || null,
          },
        };
        onClassCreate(currentClassData);
      }
    }, 300); 

    return () => {
      clearTimeout(handler);
    };
  }, [
    title, professor, classTime, classroom, selectedWidgets, emoji,
    vectorStoreId, assistantId, onClassCreate, isEditing
  ]);


  const handleToggleWidget = (id: WidgetType) => {
    setSelectedWidgets(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return safePrev.includes(id)
        ? safePrev.filter(widgetId => widgetId !== id)
        : [...safePrev, id];
    });
  };

  const handleSelectEmoji = (selectedEmoji: string) => {
    setEmoji(selectedEmoji);
    setShowEmojiPicker(false);
  };

  return (
    <ScrollArea className="max-h-[calc(80vh-180px)]"> 
      <div className="space-y-6 py-2 pr-4">
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

        {showEmojiPicker && (
          <EmojiPicker
            open={showEmojiPicker}
            onOpenChange={setShowEmojiPicker}
            onSelect={handleSelectEmoji}
          />
        )}

        {/* REMOVED OpenAIConfigSection from rendering.
          The component src/components/class/dialog/OpenAIConfigSection.tsx is now unused by this dialog.
          The state variables vectorStoreId and assistantId are still managed and passed in ClassData
          as they are auto-provisioned and part of the data model.
        */}
        {/*
        <OpenAIConfigSection
          vectorStoreId={vectorStoreId}
          assistantId={assistantId}
          showOpenAIConfig={showOpenAIConfig} // This state variable was removed
          onVectorStoreIdChange={setVectorStoreId}
          onAssistantIdChange={setAssistantId}
          onToggleConfig={() => setShowOpenAIConfig(!showOpenAIConfig)} // This handler and showOpenAIConfig state were removed
          isEditing={isEditing} 
        />
        */}

        <WidgetSelectionSection
          selectedWidgets={selectedWidgets}
          availableWidgets={availableWidgets}
          onToggleWidget={handleToggleWidget}
        />
      </div>
    </ScrollArea>
  );
}