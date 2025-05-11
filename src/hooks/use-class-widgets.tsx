
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

  // Load class widgets from database or session storage
  useEffect(() => {
    const loadClassWidgets = async () => {
      setIsLoading(true);
      try {
        // Always try to load from database if user is authenticated and class ID exists
        if (user && classId) {
          console.log(`Attempting to load widgets for class ${classId} from database`);
          const { data, error } = await supabase
            .from('class_openai_configs')
            .select('class_title')
            .eq('class_title', classId)
            .eq('user_id', user.id)
            .maybeSingle();
            
          if (error) {
            console.error("Error loading class from database:", error);
            throw error;
          } else if (data) {
            console.log(`Found class ${classId} in database`);
            // If class exists in database, try to load from session storage first
            const storedWidgets = sessionStorage.getItem(`class_widgets_${classId}`);
            if (storedWidgets) {
              try {
                const parsedWidgets = JSON.parse(storedWidgets);
                setEnabledWidgets(parsedWidgets);
                console.log(`Loaded widgets for class ${classId} from session:`, parsedWidgets);
                setIsLoading(false);
                return;
              } catch (error) {
                console.error("Error parsing stored widgets:", error);
              }
            }
          }
        }
        
        // Try to load from classId session storage
        if (classId) {
          const storedWidgets = sessionStorage.getItem(`class_widgets_${classId}`);
          if (storedWidgets) {
            try {
              const parsedWidgets = JSON.parse(storedWidgets);
              setEnabledWidgets(parsedWidgets);
              console.log(`Loaded widgets for class ${classId}:`, parsedWidgets);
              setIsLoading(false);
              return;
            } catch (error) {
              console.error("Error parsing stored widgets:", error);
            }
          }
        }
        
        // Try to load from active class
        const activeClass = sessionStorage.getItem('activeClass');
        if (activeClass) {
          try {
            const parsedClass = JSON.parse(activeClass);
            if (parsedClass.enabledWidgets) {
              setEnabledWidgets(parsedClass.enabledWidgets);
              console.log('Using widgets from active class:', parsedClass.enabledWidgets);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error("Error parsing active class:", e);
          }
        }
        
        // Fall back to defaults
        setEnabledWidgets(defaultWidgets);
        console.log('Using default widgets:', defaultWidgets);
      } catch (error) {
        console.error("Error loading class widgets:", error);
        setEnabledWidgets(defaultWidgets);
      } finally {
        setIsLoading(false);
      }
    };

    loadClassWidgets();
  }, [classId, defaultWidgets, user]);

  // Save widgets to session storage when they change
  useEffect(() => {
    if (!isLoading && classId) {
      try {
        sessionStorage.setItem(`class_widgets_${classId}`, JSON.stringify(enabledWidgets));
        
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
    }
  }, [enabledWidgets, classId, isLoading, toast]);

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
