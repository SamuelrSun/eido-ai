
import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWidgetBase, WidgetType } from "./use-widget-base";

// Re-export WidgetType so other components can import it from here
export type { WidgetType } from "./use-widget-base";

interface WidgetsContextType {
  enabledWidgets: WidgetType[];
  toggleWidget: (widget: WidgetType) => void;
  isWidgetEnabled: (widget: WidgetType) => boolean;
  isLoading: boolean;
}

// Default widgets that are enabled for all users - Calendar has been removed
const DEFAULT_WIDGETS: WidgetType[] = ["flashcards", "quizzes"];

const WidgetsContext = createContext<WidgetsContextType>({
  enabledWidgets: [],
  toggleWidget: () => {},
  isWidgetEnabled: () => false,
  isLoading: true,
});

export const useWidgets = () => useContext(WidgetsContext);

export const WidgetsProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const [localIsLoading, setLocalIsLoading] = useState<boolean>(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  const {
    enabledWidgets,
    toggleWidget: baseToggleWidget,
    isWidgetEnabled,
    isLoading: baseIsLoading,
    setWidgets
  } = useWidgetBase({
    defaultWidgets: DEFAULT_WIDGETS,
    storageKey: "enabledWidgets"
  });

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle auth changes including logout
      const newUser = session?.user || null;
      setUser(newUser);
      
      // On logout, reset to defaults or local storage
      if (event === 'SIGNED_OUT') {
        const storedWidgets = localStorage.getItem("enabledWidgets");
        if (storedWidgets) {
          try {
            const parsedWidgets = JSON.parse(storedWidgets);
            setWidgets(parsedWidgets);
          } catch (e) {
            console.error("Failed to parse stored widgets", e);
            setWidgets(DEFAULT_WIDGETS);
          }
        } else {
          setWidgets(DEFAULT_WIDGETS);
        }
        setLocalIsLoading(false);
        setInitialLoadDone(true);
      }
    });

    // Initial auth check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [setWidgets]);

  // Load user widgets when user changes
  useEffect(() => {
    if (initialLoadDone) return; // Prevent reloading after initial load
    
    const loadUserWidgets = async () => {
      setLocalIsLoading(true);
      
      try {
        if (user) {
          console.log("Loading widgets for user:", user.id);
          
          try {
            // Try to fetch user's widget preferences
            const { data, error } = await supabase
              .from('user_widgets')
              .select('enabled_widgets')
              .eq('user_id', user.id)
              .single();

            if (error) {
              // Only throw if it's not a "no rows returned" error
              if (error.code !== 'PGRST116') {
                throw error;
              }
              
              // If no widgets found for user, create default entry
              console.log("No user widgets found, creating defaults");
              try {
                await supabase
                  .from('user_widgets')
                  .insert({
                    user_id: user.id,
                    enabled_widgets: DEFAULT_WIDGETS
                  });
              } catch (insertError) {
                console.error("Error creating default widgets:", insertError);
              }
              
              setWidgets(DEFAULT_WIDGETS);
            } else if (data) {
              console.log("Found user widgets:", data.enabled_widgets);
              // Convert string array to WidgetType array with type safety
              const widgets = data.enabled_widgets
                .filter((widget: string) => 
                  ["flashcards", "quizzes", "calendar", "supertutor", "database", "practice"].includes(widget)
                ) as WidgetType[];
              
              setWidgets(widgets);
            }
          } catch (dbError) {
            console.error("Database error:", dbError);
            // Use local storage as fallback
            const storedWidgets = localStorage.getItem("enabledWidgets");
            if (storedWidgets) {
              try {
                const parsedWidgets = JSON.parse(storedWidgets);
                setWidgets(parsedWidgets);
              } catch (e) {
                setWidgets(DEFAULT_WIDGETS);
              }
            } else {
              setWidgets(DEFAULT_WIDGETS);
            }
          }
        } else {
          // Use local storage for non-authenticated users
          const storedWidgets = localStorage.getItem("enabledWidgets");
          if (storedWidgets) {
            try {
              const parsedWidgets = JSON.parse(storedWidgets);
              console.log("Using local storage widgets:", parsedWidgets);
              setWidgets(parsedWidgets);
            } catch (e) {
              console.error("Failed to parse stored widgets", e);
              setWidgets(DEFAULT_WIDGETS);
            }
          } else {
            console.log("No local storage widgets, using defaults");
            setWidgets(DEFAULT_WIDGETS);
            localStorage.setItem("enabledWidgets", JSON.stringify(DEFAULT_WIDGETS));
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
        setWidgets(DEFAULT_WIDGETS);
      } finally {
        setLocalIsLoading(false);
        setInitialLoadDone(true);
      }
    };

    // Load widgets whenever user state changes
    loadUserWidgets();
  }, [user, toast, setWidgets, initialLoadDone]);

  // Save widget changes to database when they change
  useEffect(() => {
    if (!initialLoadDone) return; // Avoid saving during initial load
    
    const saveWidgets = async () => {
      try {
        console.log("Saving widgets:", enabledWidgets);
        
        // Always save to localStorage regardless of authentication status
        // This ensures persistence across page reloads for both logged-in and guest users
        localStorage.setItem("enabledWidgets", JSON.stringify(enabledWidgets));
        
        if (user) {
          // Save to database for authenticated users
          console.log("Saving to database for user:", user.id);
          try {
            const { error } = await supabase
              .from('user_widgets')
              .upsert({
                user_id: user.id,
                enabled_widgets: enabledWidgets,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id' });
              
            if (error) {
              throw error;
            }
          } catch (dbError) {
            console.error("Database error while saving widgets:", dbError);
          }
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
    if (!localIsLoading && !baseIsLoading) {
      saveWidgets();
    }
  }, [enabledWidgets, user, localIsLoading, baseIsLoading, toast, initialLoadDone]);

  // Custom toggle wrapper that handles database updates
  const toggleWidget = (widget: WidgetType) => {
    console.log("Toggling widget:", widget);
    baseToggleWidget(widget);
  };

  const isLoading = localIsLoading || baseIsLoading;

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
