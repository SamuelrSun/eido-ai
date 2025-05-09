
import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WidgetType = "flashcards" | "quizzes" | "calendar" | "supertutor" | "database";

interface WidgetsContextType {
  enabledWidgets: WidgetType[];
  toggleWidget: (widget: WidgetType) => void;
  isWidgetEnabled: (widget: WidgetType) => boolean;
}

const WidgetsContext = createContext<WidgetsContextType>({
  enabledWidgets: [],
  toggleWidget: () => {},
  isWidgetEnabled: () => false,
});

// Default widgets that are enabled for all users
const DEFAULT_WIDGETS: WidgetType[] = ["flashcards", "calendar"];

export const useWidgets = () => useContext(WidgetsContext);

export const WidgetsProvider = ({ children }: { children: ReactNode }) => {
  const [enabledWidgets, setEnabledWidgets] = useState<WidgetType[]>(DEFAULT_WIDGETS);

  // Load widgets from localStorage or use defaults
  useEffect(() => {
    const storedWidgets = localStorage.getItem("enabledWidgets");
    if (storedWidgets) {
      try {
        setEnabledWidgets(JSON.parse(storedWidgets));
      } catch (e) {
        console.error("Failed to parse stored widgets", e);
        setEnabledWidgets(DEFAULT_WIDGETS);
      }
    }

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // Reset to defaults on sign out
        setEnabledWidgets(DEFAULT_WIDGETS);
        localStorage.setItem("enabledWidgets", JSON.stringify(DEFAULT_WIDGETS));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Save widget changes to localStorage
  useEffect(() => {
    localStorage.setItem("enabledWidgets", JSON.stringify(enabledWidgets));
  }, [enabledWidgets]);

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

  return (
    <WidgetsContext.Provider value={{ 
      enabledWidgets, 
      toggleWidget,
      isWidgetEnabled
    }}>
      {children}
    </WidgetsContext.Provider>
  );
};
