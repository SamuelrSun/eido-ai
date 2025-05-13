// src/hooks/use-widgets.tsx
import { createContext, useState, useContext, useEffect, ReactNode, useCallback } from "react";
// import { supabase } from "@/integrations/supabase/client"; // Supabase import commented out
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js"; // Keep for user state if needed elsewhere, or remove if not
import { supabase } from "@/integrations/supabase/client"; // Keep for auth listener

export type WidgetType = "flashcards" | "quizzes" | "supertutor" | "database";

interface WidgetsContextType {
  enabledWidgets: WidgetType[];
  toggleWidget: (widget: WidgetType) => void;
  isWidgetEnabled: (widget: WidgetType) => boolean;
  isLoading: boolean;
}

const WidgetsContext = createContext<WidgetsContextType>({
  enabledWidgets: [],
  toggleWidget: () => {},
  isWidgetEnabled: () => false,
  isLoading: true,
});

const DEFAULT_WIDGETS: WidgetType[] = ["flashcards", "quizzes", "supertutor", "database"]; // Ensure all are default

export const useWidgets = () => useContext(WidgetsContext);

export const WidgetsProvider = ({ children }: { children: ReactNode }) => {
  const [enabledWidgets, setEnabledWidgets] = useState<WidgetType[]>(DEFAULT_WIDGETS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null); // Still useful to know if user is logged in
  const { toast } = useToast();

  // Listen for auth state changes to clear localStorage if needed, or load user-specific if table existed
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user || null;
      setUser(newUser);
      
      if (event === 'SIGNED_OUT') {
        console.log("use-widgets: User signed out. Widgets will rely on localStorage.");
      } else if (event === 'SIGNED_IN') {
        console.log("use-widgets: User signed in. Widgets will rely on localStorage.");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);


  const loadWidgetsFromStorage = useCallback(() => {
    setIsLoading(true);
    try {
      const storedWidgets = localStorage.getItem("enabledWidgets");
      if (storedWidgets) {
        const parsedWidgets = JSON.parse(storedWidgets) as WidgetType[];
        // Validate widgets from localStorage
        const validWidgets = parsedWidgets.filter(w => 
            ["flashcards", "quizzes", "supertutor", "database"].includes(w)
        );
        setEnabledWidgets(validWidgets.length > 0 ? validWidgets : DEFAULT_WIDGETS);
        console.log("use-widgets: Loaded widgets from localStorage:", validWidgets.length > 0 ? validWidgets : DEFAULT_WIDGETS);
      } else {
        setEnabledWidgets(DEFAULT_WIDGETS);
        localStorage.setItem("enabledWidgets", JSON.stringify(DEFAULT_WIDGETS));
        console.log("use-widgets: No widgets in localStorage, set and using defaults.");
      }
    } catch (e) {
      // MODIFICATION: Handle 'e' as unknown
      let errorMessage = "Failed to parse stored widgets, using defaults.";
      if (e instanceof Error) {
        errorMessage = `${errorMessage} Error: ${e.message}`;
      }
      console.error("use-widgets: " + errorMessage, e);
      setEnabledWidgets(DEFAULT_WIDGETS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load widgets from localStorage on initial mount
  useEffect(() => {
    loadWidgetsFromStorage();
  }, [loadWidgetsFromStorage]);

  // Save widget changes to localStorage
  useEffect(() => {
    if (isLoading) return; 
    
    try {
      localStorage.setItem("enabledWidgets", JSON.stringify(enabledWidgets));
      console.log("use-widgets: Saved widgets to localStorage:", enabledWidgets);
    } catch (error: unknown) { // MODIFICATION: Changed 'error: any' to 'error: unknown'
      console.error("use-widgets: Error saving widgets to localStorage:", error);
      let description = "Could not save your widget settings locally.";
      // Type check for error before accessing message property
      if (error instanceof Error) {
        description = error.message || description;
      }
      toast({
        title: "Error Saving Widget Preferences",
        description: description,
        variant: "destructive",
      });
    }
  }, [enabledWidgets, isLoading, toast]);

  const toggleWidget = (widget: WidgetType) => {
    setEnabledWidgets(current => {
      const newEnabledWidgets = current.includes(widget)
        ? current.filter(w => w !== widget)
        : [...current, widget];
      return newEnabledWidgets;
    });
  };

  const isWidgetEnabled = (widget: WidgetType) => {
    return enabledWidgets.includes(widget);
  };

  return (
    <WidgetsContext.Provider value={{ 
      enabledWidgets, 
      toggleWidget,
      isWidgetEnabled,
      isLoading
    }}>
      {children}
    </WidgetsContext.Provider>
  );
};
