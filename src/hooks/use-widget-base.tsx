
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

  // Local storage handler
  const saveToLocalStorage = (key: string, widgets: WidgetType[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(widgets));
      return true;
    } catch (error) {
      console.error(`Error saving widgets to ${key}:`, error);
      return false;
    }
  };

  // Session storage handler
  const saveToSessionStorage = (key: string, widgets: WidgetType[]) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(widgets));
      return true;
    } catch (error) {
      console.error(`Error saving widgets to ${key}:`, error);
      return false;
    }
  };

  // Load widgets from storage based on provided options
  const loadFromStorage = (key: string) => {
    try {
      const storage = key.startsWith('session:') 
        ? sessionStorage 
        : localStorage;
      
      const actualKey = key.startsWith('session:') 
        ? key.substring(8) 
        : key;
        
      const storedWidgets = storage.getItem(actualKey);
      
      if (storedWidgets) {
        try {
          const parsedWidgets = JSON.parse(storedWidgets);
          if (Array.isArray(parsedWidgets)) {
            // Filter to ensure only valid widget types
            const validWidgets = parsedWidgets.filter((widget: any) => 
              ["flashcards", "quizzes", "calendar", "supertutor", "database", "practice"].includes(widget)
            ) as WidgetType[];
            
            console.log(`Loaded widgets from ${key}:`, validWidgets);
            return validWidgets;
          }
        } catch (e) {
          console.error(`Failed to parse stored widgets from ${key}:`, e);
        }
      }
    } catch (error) {
      console.error(`Error loading widgets from ${key}:`, error);
    }
    
    return null;
  };

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
