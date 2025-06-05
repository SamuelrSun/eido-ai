// src/hooks/use-class-widgets.tsx
import { createContext, useState, useContext, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WidgetType } from "@/hooks/use-widgets";
import type { User } from "@supabase/supabase-js";

// Interface for the structure of rows from the 'classes' table
// This should align with your CustomDatabase['public']['Tables']['classes']['Row']
interface ClassesDBRow {
  class_id: string; // Primary Key
  class_title: string;
  professor?: string | null;
  class_time?: string | null;
  classroom?: string | null;
  vector_store_id?: string | null;
  assistant_id?: string | null;
  user_id?: string | null; // Foreign Key to auth.users
  emoji?: string | null;
  enabled_widgets?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}


interface ClassWidgetsContextType {
  enabledWidgets: WidgetType[];
  toggleWidget: (widget: WidgetType) => void;
  isWidgetEnabled: (widget: WidgetType) => boolean;
  isLoading: boolean;
  setClassWidgets: (widgets: WidgetType[]) => void;
}

interface ClassWidgetsProviderProps {
  children: ReactNode;
  classId?: string; // This should correspond to class_title for querying
  defaultWidgets?: WidgetType[];
}

export const DEFAULT_CLASS_WIDGETS: WidgetType[] = ["supertutor", "database"];

const ClassWidgetsContext = createContext<ClassWidgetsContextType>({
  enabledWidgets: DEFAULT_CLASS_WIDGETS,
  toggleWidget: () => {},
  isWidgetEnabled: () => false,
  isLoading: true,
  setClassWidgets: () => {},
});

export const useClassWidgets = () => useContext(ClassWidgetsContext);

export const ClassWidgetsProvider = ({ 
  children, 
  classId, 
  defaultWidgets = DEFAULT_CLASS_WIDGETS 
}: ClassWidgetsProviderProps) => {
  const [enabledWidgets, setEnabledWidgets] = useState<WidgetType[]>(defaultWidgets);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [currentDbClassId, setCurrentDbClassId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadClassWidgets = useCallback(async () => {
    // MODIFICATION: Check user?.id instead of just user
    if (!user?.id || !classId) {
      setEnabledWidgets(defaultWidgets);
      setIsLoading(false);
      setCurrentDbClassId(null);
      console.log("use-class-widgets: No user.id or classId, using defaults.", { userId: user?.id, classId });
      return;
    }

    setIsLoading(true);
    // MODIFICATION: Use user.id in the log message
    console.log(`use-class-widgets: Attempting to load widgets for class title "${classId}" for user ID ${user.id}`); 
    try {
      const { data, error } = await supabase
        .from('classes') 
        .select('*') 
        .eq('class_title', classId) 
        .eq('user_id', user.id) // user.id is safe to use here due to the check above
        .maybeSingle();
        
      if (error) {
        console.error(`use-class-widgets: Error loading class "${classId}" from database:`, error);
        throw error;
      }
      
      if (data) {
        const dbRecord = data as ClassesDBRow;
        console.log(`use-class-widgets: Found class "${classId}" in database:`, dbRecord);
        setCurrentDbClassId(dbRecord.class_id);

        if (dbRecord.enabled_widgets && Array.isArray(dbRecord.enabled_widgets)) {
          const validWidgets = dbRecord.enabled_widgets.filter(w => 
            ["supertutor", "database", "flashcards", "quizzes"].includes(w)
          ) as WidgetType[];
          setEnabledWidgets(validWidgets.length > 0 ? validWidgets : defaultWidgets);
          console.log(`use-class-widgets: Loaded widgets for class "${classId}" from database:`, validWidgets);
        } else {
          setEnabledWidgets(defaultWidgets);
          console.log(`use-class-widgets: No valid widgets array in DB for class "${classId}", using defaults.`);
        }
      } else {
        setEnabledWidgets(defaultWidgets);
        setCurrentDbClassId(null);
        console.log(`use-class-widgets: Class "${classId}" not found in database for this user, using defaults.`);
      }
    } catch (error) {
      console.error(`use-class-widgets: Exception loading class widgets for "${classId}":`, error);
      setEnabledWidgets(defaultWidgets);
      setCurrentDbClassId(null);
      toast({
        title: "Error Loading Class Widgets",
        description: `Could not load widget settings for ${classId}.`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  // MODIFICATION: Changed dependency from 'user' to 'user?.id'
  }, [classId, user?.id, defaultWidgets, toast]); 

  useEffect(() => {
    loadClassWidgets();
  }, [loadClassWidgets]); // This useEffect will now re-run if loadClassWidgets changes due to user.id changing


  useEffect(() => {
    const saveWidgets = async () => {
      // MODIFICATION: Check user?.id
      if (isLoading || !user?.id || !classId || !currentDbClassId) {
        console.log("use-class-widgets: Save skipped.", {isLoading, userId: user?.id, classId, currentDbClassId});
        return;
      }
      
      try {
        console.log(`use-class-widgets: Saving widgets for class_id "${currentDbClassId}" (title: "${classId}") to database:`, enabledWidgets);
        
        const { error: updateError } = await supabase
          .from('classes')
          .update({ 
            enabled_widgets: enabledWidgets,
            updated_at: new Date().toISOString()
          })
          .eq('class_id', currentDbClassId)
          .eq('user_id', user.id); // user.id is safe
            
        if (updateError) {
          console.error(`use-class-widgets: Error updating class widgets for class_id "${currentDbClassId}":`, updateError);
          throw updateError;
        }
        console.log(`use-class-widgets: Successfully saved widgets for class_id "${currentDbClassId}"`);
        
        const activeClassSession = sessionStorage.getItem('activeClass');
        if (activeClassSession) {
          try {
            const parsedClass = JSON.parse(activeClassSession);
            if (parsedClass.class_id === currentDbClassId || parsedClass.title === classId) {
              parsedClass.enabledWidgets = enabledWidgets;
              sessionStorage.setItem('activeClass', JSON.stringify(parsedClass));
              console.log("use-class-widgets: Updated widgets in active class in session storage");
            }
          } catch (e) {
            console.error("use-class-widgets: Error updating active class in session storage:", e);
          }
        }
      } catch (error) {
        console.error("use-class-widgets: Error saving class widgets:", error);
        toast({
          title: "Error Saving Widget Preferences",
          description: "Failed to save your widget preferences for this class.",
          variant: "destructive",
        });
      }
    };

    // MODIFICATION: Check user?.id
    if (!isLoading && user?.id && classId && currentDbClassId) {
        const timeoutId = setTimeout(saveWidgets, 500); 
        return () => clearTimeout(timeoutId);
    }
  // MODIFICATION: Changed dependency from 'user' to 'user?.id'
  }, [enabledWidgets, classId, isLoading, toast, user?.id, currentDbClassId]); 

  const toggleWidget = (widget: WidgetType) => {
    console.log(`use-class-widgets: Toggling widget ${widget} for class ${classId}`);
    setEnabledWidgets(current => {
      const currentIsArray = Array.isArray(current);
      const safeCurrentWidgets = currentIsArray ? current : defaultWidgets;
      
      if (safeCurrentWidgets.includes(widget)) {
        return safeCurrentWidgets.filter(w => w !== widget);
      } else {
        return [...safeCurrentWidgets, widget];
      }
    });
  };

  const isWidgetEnabled = (widget: WidgetType) => {
    const currentSafeWidgets = Array.isArray(enabledWidgets) ? enabledWidgets : defaultWidgets;
    return currentSafeWidgets.includes(widget);
  };

  const setClassWidgetsState = (widgets: WidgetType[]) => {
    if (!Array.isArray(widgets)) {
      console.warn("use-class-widgets: Attempted to set non-array widgets:", widgets);
      setEnabledWidgets(defaultWidgets);
      return;
    }
    setEnabledWidgets(widgets);
  };

  const contextValue = {
    enabledWidgets: Array.isArray(enabledWidgets) ? enabledWidgets : defaultWidgets,
    toggleWidget,
    isWidgetEnabled,
    isLoading,
    setClassWidgets: setClassWidgetsState
  };

  return (
    <ClassWidgetsContext.Provider value={contextValue}>
      {children}
    </ClassWidgetsContext.Provider>
  );
};