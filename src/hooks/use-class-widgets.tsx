
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
  enabled_widgets?: string[];
}

// Default widgets for any class
export const DEFAULT_CLASS_WIDGETS: WidgetType[] = ["supertutor", "database"];

const ClassWidgetsContext = createContext<ClassWidgetsContextType>({
  enabledWidgets: [],
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

  // Check for authenticated user
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
          console.log(`Attempting to load widgets for class ${classId} from database`);
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
                  if (configData.enabled_widgets) {
                    setEnabledWidgets(configData.enabled_widgets as WidgetType[]);
                    console.log(`Loaded widgets for class ${classId} from database:`, configData.enabled_widgets);
                    setIsLoading(false);
                    return;
                  }
                }
              }
            } catch (e) {
              console.error("Error updating active class:", e);
            }
            
            // If no enabled_widgets found in the database record, use defaults
            setEnabledWidgets(defaultWidgets);
            console.log(`No widgets found in database for class ${classId}, using defaults:`, defaultWidgets);
          } else {
            // Class not found in database, use defaults
            setEnabledWidgets(defaultWidgets);
            console.log(`Class ${classId} not found in database, using defaults:`, defaultWidgets);
          }
        } else {
          // No user authenticated or no class ID, use defaults
          setEnabledWidgets(defaultWidgets);
          console.log('No user or classId, using default widgets:', defaultWidgets);
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

  // Save widgets to database when they change
  useEffect(() => {
    const saveWidgets = async () => {
      if (isLoading || !user || !classId) return;
      
      try {
        console.log(`Saving widgets for class ${classId} to database:`, enabledWidgets);
        
        // Try to update in database
        const { error } = await supabase
          .from('class_openai_configs')
          .update({ 
            enabled_widgets: enabledWidgets,
            updated_at: new Date().toISOString()
          })
          .eq('class_title', classId)
          .eq('user_id', user.id);
          
        if (error) {
          // If update fails, it might be because the record doesn't exist yet
          console.log('Update failed, trying to insert:', error);
          
          // Try to insert a new record
          const { error: insertError } = await supabase
            .from('class_openai_configs')
            .insert({ 
              class_title: classId,
              user_id: user.id,
              enabled_widgets: enabledWidgets 
            });
            
          if (insertError) {
            console.error("Error inserting class widgets to database:", insertError);
            throw insertError;
          }
        }
        
        // Also update the active class if this is the active class
        const activeClass = sessionStorage.getItem('activeClass');
        if (activeClass) {
          try {
            const parsedClass = JSON.parse(activeClass);
            if (parsedClass.title === classId) {
              parsedClass.enabledWidgets = enabledWidgets;
              sessionStorage.setItem('activeClass', JSON.stringify(parsedClass));
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

    saveWidgets();
  }, [enabledWidgets, classId, isLoading, toast, user]);

  const toggleWidget = (widget: WidgetType) => {
    console.log("Toggling widget for class:", widget);
    setEnabledWidgets(current => {
      if (current.includes(widget)) {
        return current.filter(w => w !== widget);
      } else {
        return [...current, widget];
      }
    });
  };

  const isWidgetEnabled = (widget: WidgetType) => {
    return enabledWidgets.includes(widget);
  };

  const setClassWidgets = (widgets: WidgetType[]) => {
    setEnabledWidgets(widgets);
  };

  return (
    <ClassWidgetsContext.Provider value={{ 
      enabledWidgets, 
      toggleWidget,
      isWidgetEnabled,
      isLoading,
      setClassWidgets
    }}>
      {children}
    </ClassWidgetsContext.Provider>
  );
};
