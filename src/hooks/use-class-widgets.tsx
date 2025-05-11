
import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { WidgetType } from "@/hooks/use-widgets";

interface ClassWidgetsContextType {
  enabledWidgets: WidgetType[];
  toggleWidget: (widget: WidgetType) => void;
  isWidgetEnabled: (widget: WidgetType) => boolean;
  isLoading: boolean;
  setClassWidgets: (widgets: WidgetType[]) => void;
}

interface ClassWidgetsProviderProps {
  children: ReactNode;
  classId?: string;
  defaultWidgets?: WidgetType[];
}

// Enhanced interface to match the database response
interface ClassOpenAIConfigRow {
  api_key?: string;
  assistant_id?: string;
  class_time?: string;
  class_title: string;
  classroom?: string;
  created_at?: string;
  emoji?: string;
  id: string;
  professor?: string;
  updated_at?: string;
  user_id?: string;
  vector_store_id?: string;
  enabled_widgets?: string[];
}

// Default widgets for any class
export const DEFAULT_CLASS_WIDGETS: WidgetType[] = ["flashcards", "quizzes"];

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
  const [user, setUser] = useState<any>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Check for authenticated user
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Auth session in class widgets:", session?.user?.id);
        setUser(session?.user || null);
      } catch (error) {
        console.error("Error checking auth in class widgets:", error);
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change in class widgets:", event, session?.user?.id);
      setUser(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Load class widgets from database
  useEffect(() => {
    const loadClassWidgets = async () => {
      setIsLoading(true);
      try {
        // Always try to load from database if user is authenticated and class ID exists
        if (user && classId) {
          console.log(`Attempting to load widgets for class ${classId} from database with user ID ${user.id}`);
          const { data, error } = await supabase
            .from('class_openai_configs')
            .select('*')
            .eq('class_title', classId)
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (error) {
            console.error("Error loading class from database:", error);
            throw error;
          } else if (data) {
            console.log(`Found class ${classId} in database:`, data);
            
            // Try to update active class in session storage
            try {
              const activeClass = sessionStorage.getItem('activeClass');
              if (activeClass) {
                const parsedClass = JSON.parse(activeClass);
                if (parsedClass.title === classId) {
                  // Cast data as our enhanced interface
                  const configData = data as ClassOpenAIConfigRow;
                  
                  // Check if enabled_widgets exists in the database response
                  if (configData.enabled_widgets && Array.isArray(configData.enabled_widgets)) {
                    console.log(`Loaded widgets for class ${classId} from database:`, configData.enabled_widgets);
                    setEnabledWidgets(configData.enabled_widgets as WidgetType[]);
                    setIsLoading(false);
                    return;
                  }
                }
              }
            } catch (e) {
              console.error("Error updating active class:", e);
            }
            
            // If no enabled_widgets found in the database record, use defaults
            console.log(`No valid widgets found in database for class ${classId}, using defaults:`, defaultWidgets);
            setEnabledWidgets(defaultWidgets);
          } else {
            // Class not found in database, use defaults
            console.log(`Class ${classId} not found in database, using defaults:`, defaultWidgets);
            setEnabledWidgets(defaultWidgets);
          }
        } else {
          // No user authenticated or no class ID, use defaults
          if (!user) {
            console.log('No user authenticated in class widgets, using default widgets:', defaultWidgets);
          } else if (!classId) {
            console.log('No classId provided in class widgets, using default widgets:', defaultWidgets);
          }
          setEnabledWidgets(defaultWidgets);
        }
      } catch (error) {
        console.error("Error loading class widgets:", error);
        setEnabledWidgets(defaultWidgets);
      } finally {
        setIsLoading(false);
      }
    };

    loadClassWidgets();
  }, [classId, defaultWidgets, user]);

  // Save widgets to database when they change with debounce
  useEffect(() => {
    const saveWidgets = async () => {
      if (isLoading || !user || !classId) return;
      
      try {
        console.log(`Saving widgets for class ${classId} to database:`, enabledWidgets);
        
        // Try to update in database
        const { data, error } = await supabase
          .from('class_openai_configs')
          .select('id')
          .eq('class_title', classId)
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) {
          console.error("Error checking if class exists:", error);
          throw error;
        }
        
        if (data) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('class_openai_configs')
            .update({ 
              enabled_widgets: enabledWidgets,
              updated_at: new Date().toISOString()
            })
            .eq('id', data.id)
            .eq('user_id', user.id);
            
          if (updateError) {
            console.error("Error updating class widgets:", updateError);
            throw updateError;
          }
        } else {
          // Create new record
          const { error: insertError } = await supabase
            .from('class_openai_configs')
            .insert({ 
              class_title: classId,
              user_id: user.id,
              enabled_widgets: enabledWidgets,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error("Error inserting class widgets:", insertError);
            throw insertError;
          }
        }
        
        console.log(`Successfully saved widgets for class ${classId}`);
        
        // Also update the active class if this is the active class
        const activeClass = sessionStorage.getItem('activeClass');
        if (activeClass) {
          try {
            const parsedClass = JSON.parse(activeClass);
            if (parsedClass.title === classId) {
              parsedClass.enabledWidgets = enabledWidgets;
              sessionStorage.setItem('activeClass', JSON.stringify(parsedClass));
              console.log("Updated widgets in active class in session storage");
            }
          } catch (e) {
            console.error("Error updating active class:", e);
          }
        }
      } catch (error) {
        console.error("Error saving class widgets:", error);
        toast({
          title: "Error saving widget preferences",
          description: "Failed to save your widget preferences for this class.",
          variant: "destructive",
        });
      }
    };

    // Clear any existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Set a new timeout to debounce the save operation
    if (!isLoading && user && classId) {
      const timeout = setTimeout(() => {
        saveWidgets();
      }, 500);
      setSaveTimeout(timeout);
    }
    
    // Cleanup on unmount
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [enabledWidgets, classId, isLoading, toast, user]);

  const toggleWidget = (widget: WidgetType) => {
    console.log(`Toggling widget ${widget} for class ${classId}`);
    setEnabledWidgets(current => {
      const currentIsArray = Array.isArray(current);
      const safeCurrentWidgets = currentIsArray ? current : DEFAULT_CLASS_WIDGETS;
      
      if (safeCurrentWidgets.includes(widget)) {
        console.log(`Removing widget ${widget}`);
        return safeCurrentWidgets.filter(w => w !== widget);
      } else {
        console.log(`Adding widget ${widget}`);
        return [...safeCurrentWidgets, widget];
      }
    });
  };

  const isWidgetEnabled = (widget: WidgetType) => {
    if (!Array.isArray(enabledWidgets)) {
      return DEFAULT_CLASS_WIDGETS.includes(widget);
    }
    return enabledWidgets.includes(widget);
  };

  const setClassWidgets = (widgets: WidgetType[]) => {
    if (!Array.isArray(widgets)) {
      console.warn("Attempted to set non-array widgets:", widgets);
      setEnabledWidgets(DEFAULT_CLASS_WIDGETS);
      return;
    }
    setEnabledWidgets(widgets);
  };

  const contextValue = {
    enabledWidgets: Array.isArray(enabledWidgets) ? enabledWidgets : DEFAULT_CLASS_WIDGETS,
    toggleWidget,
    isWidgetEnabled,
    isLoading,
    setClassWidgets
  };

  return (
    <ClassWidgetsContext.Provider value={contextValue}>
      {children}
    </ClassWidgetsContext.Provider>
  );
};
