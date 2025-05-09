
import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type WidgetType = "flashcards" | "quizzes" | "calendar" | "supertutor" | "database";

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

// Default widgets that are enabled for all users
const DEFAULT_WIDGETS: WidgetType[] = ["flashcards", "calendar"];

export const useWidgets = () => useContext(WidgetsContext);

export const WidgetsProvider = ({ children }: { children: ReactNode }) => {
  const [enabledWidgets, setEnabledWidgets] = useState<WidgetType[]>(DEFAULT_WIDGETS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    // Initial auth check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user widgets when user changes
  useEffect(() => {
    const loadUserWidgets = async () => {
      setIsLoading(true);
      
      try {
        if (user) {
          // Try to fetch user's widget preferences
          const { data, error } = await supabase
            .from('user_widgets')
            .select('enabled_widgets')
            .eq('user_id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            throw error;
          }

          if (data) {
            // Convert string array to WidgetType array with type safety
            const widgets = data.enabled_widgets
              .filter((widget: string) => 
                ["flashcards", "quizzes", "calendar", "supertutor", "database"].includes(widget)
              ) as WidgetType[];
            
            setEnabledWidgets(widgets);
          } else {
            // Create default widgets for new user
            await supabase
              .from('user_widgets')
              .insert({
                user_id: user.id,
                enabled_widgets: DEFAULT_WIDGETS
              })
              .select();
            
            setEnabledWidgets(DEFAULT_WIDGETS);
          }
        } else {
          // Use local storage for non-authenticated users
          const storedWidgets = localStorage.getItem("enabledWidgets");
          if (storedWidgets) {
            try {
              const parsedWidgets = JSON.parse(storedWidgets);
              setEnabledWidgets(parsedWidgets);
            } catch (e) {
              console.error("Failed to parse stored widgets", e);
              setEnabledWidgets(DEFAULT_WIDGETS);
            }
          } else {
            setEnabledWidgets(DEFAULT_WIDGETS);
          }
        }
      } catch (error: any) {
        console.error("Error loading widgets:", error);
        toast({
          title: "Error loading widgets",
          description: error.message || "Failed to load your widget preferences",
          variant: "destructive",
        });
        // Fall back to defaults
        setEnabledWidgets(DEFAULT_WIDGETS);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserWidgets();
  }, [user, toast]);

  // Save widget changes to database when they change
  useEffect(() => {
    const saveWidgets = async () => {
      if (isLoading) return; // Avoid saving during initial load
      
      try {
        if (user) {
          // Save to database for authenticated users
          await supabase
            .from('user_widgets')
            .upsert({
              user_id: user.id,
              enabled_widgets: enabledWidgets,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
        } else {
          // Save to localStorage for non-authenticated users
          localStorage.setItem("enabledWidgets", JSON.stringify(enabledWidgets));
        }
      } catch (error: any) {
        console.error("Error saving widgets:", error);
        toast({
          title: "Error saving widgets",
          description: error.message || "Failed to save your widget preferences",
          variant: "destructive",
        });
      }
    };

    // Skip the first render
    if (!isLoading) {
      saveWidgets();
    }
  }, [enabledWidgets, user, isLoading, toast]);

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
      isWidgetEnabled,
      isLoading
    }}>
      {children}
    </WidgetsContext.Provider>
  );
};
