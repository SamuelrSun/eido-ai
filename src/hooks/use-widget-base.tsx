
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export type WidgetType = "flashcards" | "quizzes" | "calendar" | "supertutor" | "database" | "practice";

export interface WidgetManagerOptions {
  defaultWidgets: WidgetType[];
  storageKey?: string;
  userId?: string | null;
  tableName?: string;
}

export interface WidgetManagerState {
  enabledWidgets: WidgetType[];
  toggleWidget: (widget: WidgetType) => void;
  isWidgetEnabled: (widget: WidgetType) => boolean;
  isLoading: boolean;
  setWidgets: (widgets: WidgetType[]) => void;
}

/**
 * Base hook for managing widgets state with different storage strategies
 */
export function useWidgetBase({
  defaultWidgets,
  storageKey,
  userId,
  tableName
}: WidgetManagerOptions): WidgetManagerState {
  const [enabledWidgets, setEnabledWidgets] = useState<WidgetType[]>(defaultWidgets);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Initialize widgets with default values
  useEffect(() => {
    const initializeWidgets = async () => {
      if (storageKey) {
        try {
          let widgets: WidgetType[] | null = null;
          
          if (storageKey.startsWith('session:')) {
            const actualKey = storageKey.substring(8);
            const storedWidgets = sessionStorage.getItem(actualKey);
            if (storedWidgets) {
              try {
                const parsedWidgets = JSON.parse(storedWidgets);
                if (Array.isArray(parsedWidgets)) {
                  widgets = parsedWidgets.filter((widget: any) => 
                    ["flashcards", "quizzes", "calendar", "supertutor", "database", "practice"].includes(widget)
                  ) as WidgetType[];
                }
              } catch (e) {
                console.error(`Error parsing widgets from session storage:`, e);
              }
            }
          } else {
            const storedWidgets = localStorage.getItem(storageKey);
            if (storedWidgets) {
              try {
                const parsedWidgets = JSON.parse(storedWidgets);
                if (Array.isArray(parsedWidgets)) {
                  widgets = parsedWidgets.filter((widget: any) => 
                    ["flashcards", "quizzes", "calendar", "supertutor", "database", "practice"].includes(widget)
                  ) as WidgetType[];
                }
              } catch (e) {
                console.error(`Error parsing widgets from local storage:`, e);
              }
            }
          }
          
          if (widgets && widgets.length > 0) {
            setEnabledWidgets(widgets);
            console.log(`Loaded widgets from ${storageKey}:`, widgets);
          } else {
            console.log(`No valid widgets found in ${storageKey}, using defaults:`, defaultWidgets);
            setEnabledWidgets(defaultWidgets);
          }
        } catch (error) {
          console.error(`Error loading widgets from storage:`, error);
          setEnabledWidgets(defaultWidgets);
        }
      }
      setIsLoading(false);
    };

    initializeWidgets();
  }, [defaultWidgets, storageKey]);

  const toggleWidget = (widget: WidgetType) => {
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

  const setWidgets = (widgets: WidgetType[]) => {
    setEnabledWidgets(widgets);
  };

  return {
    enabledWidgets,
    toggleWidget,
    isWidgetEnabled,
    isLoading,
    setWidgets
  };
}
