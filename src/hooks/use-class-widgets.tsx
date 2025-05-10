
import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWidgetBase, WidgetType } from "./use-widget-base";

// Re-export WidgetType so other components can import it from here
export type { WidgetType } from "./use-widget-base";

// Default widgets for any class
export const DEFAULT_CLASS_WIDGETS: WidgetType[] = ["supertutor", "database"];

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
  const { toast } = useToast();
  const [localIsLoading, setLocalIsLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  const storageKey = classId ? `session:class_widgets_${classId}` : undefined;
  
  const {
    enabledWidgets,
    toggleWidget: baseToggleWidget,
    isWidgetEnabled,
    isLoading: baseIsLoading,
    setWidgets
  } = useWidgetBase({
    defaultWidgets,
    storageKey
  });

  // Load class widgets from session storage or use defaults
  useEffect(() => {
    if (initialLoadDone) return; // Prevent re-loading after initial load
    
    const loadClassWidgets = () => {
      setLocalIsLoading(true);
      try {
        // Try to load from active class
        const activeClass = sessionStorage.getItem('activeClass');
        if (activeClass && classId) {
          try {
            const parsedClass = JSON.parse(activeClass);
            if (parsedClass.title === classId && parsedClass.enabledWidgets) {
              setWidgets(parsedClass.enabledWidgets);
              console.log('Using widgets from active class:', parsedClass.enabledWidgets);
              setLocalIsLoading(false);
              setInitialLoadDone(true);
              return;
            }
          } catch (e) {
            console.error("Error parsing active class:", e);
          }
        }
        
        // Try to load from session storage using class ID
        if (classId) {
          const storedWidgets = sessionStorage.getItem(`class_widgets_${classId}`);
          if (storedWidgets) {
            try {
              const parsedWidgets = JSON.parse(storedWidgets);
              if (Array.isArray(parsedWidgets)) {
                setWidgets(parsedWidgets);
                console.log(`Loaded widgets for class ${classId}:`, parsedWidgets);
                setLocalIsLoading(false);
                setInitialLoadDone(true);
                return;
              }
            } catch (e) {
              console.error("Error parsing class widgets:", e);
            }
          }
        }
        
        // Fall back to defaults
        setWidgets(defaultWidgets);
        console.log('Using default widgets:', defaultWidgets);
      } catch (error) {
        console.error("Error loading class widgets:", error);
        setWidgets(defaultWidgets);
      } finally {
        setLocalIsLoading(false);
        setInitialLoadDone(true);
      }
    };

    loadClassWidgets();
  }, [classId, defaultWidgets, setWidgets, initialLoadDone]);

  // Save widgets to session storage when they change
  useEffect(() => {
    if (!initialLoadDone) return; // Don't save during initial load
    
    if (classId) {
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
  }, [enabledWidgets, classId, toast, initialLoadDone]);

  // Custom toggle wrapper
  const toggleWidget = (widget: WidgetType) => {
    console.log("Toggling widget for class:", widget);
    baseToggleWidget(widget);
  };

  const setClassWidgets = (widgets: WidgetType[]) => {
    setWidgets(widgets);
  };

  const isLoading = localIsLoading || baseIsLoading;

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
