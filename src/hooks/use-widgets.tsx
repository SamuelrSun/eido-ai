
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
const DEFAULT_WIDGETS: WidgetType[] = ["flashcards", "quizzes", "supertutor", "database"];

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
    const getInitialAuthState = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user || null);
      } catch (error) {
        console.error("Error getting initial auth state:", error);
      }
    };

    getInitialAuthState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle auth changes including logout
      const newUser = session?.user || null;
      setUser(newUser);
      
      // On logout, reset to defaults or local storage
      if (event === 'SIGNED_OUT') {
        console.log("User signed out, resetting widgets to defaults");
        const storedWidgets = localStorage.getItem("enabledWidgets");
        if (storedWidgets) {
          try {
            const parsedWidgets = JSON.parse(storedWidgets);
            if (Array.isArray(parsedWidgets) && parsedWidgets.length > 0) {
              setWidgets(parsedWidgets);
              console.log("Using stored widgets on logout:", parsedWidgets);
            } else {
              setWidgets(DEFAULT_WIDGETS);
              console.log("Using default widgets on logout (empty stored)");
            }
          } catch (e) {
            console.error("Failed to parse stored widgets on logout", e);
            setWidgets(DEFAULT_WIDGETS);
          }
        } else {
          setWidgets(DEFAULT_WIDGETS);
          console.log("Using default widgets on logout (no stored)");
        }
      }
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
              .maybeSingle();

            if (error && error.code !== 'PGRST116') {
              console.error("Database error fetching widgets:", error);
              throw error;
            }
              
            if (data) {
              console.log("Found user widgets:", data.enabled_widgets);
              // Convert string array to WidgetType array with type safety
              const widgets = data.enabled_widgets
                .filter((widget: string) => 
                  ["flashcards", "quizzes", "calendar", "supertutor", "database", "practice"].includes(widget)
                ) as WidgetType[];
              
              if (widgets.length > 0) {
                setWidgets(widgets);
              } else {
                // If we got an empty array, use defaults
                setWidgets(DEFAULT_WIDGETS);
              }
            } else {
              // If no widgets found for user, create default entry
              console.log("No user widgets found, creating defaults");
              try {
                await supabase
                  .from('user_widgets')
                  .insert({
                    user_id: user.id,
                    enabled_widgets: DEFAULT_WIDGETS
                  });
                  
                setWidgets(DEFAULT_WIDGETS);
              } catch (insertError) {
                console.error("Error creating default widgets:", insertError);
                setWidgets(DEFAULT_WIDGETS);
              }
            }
          } catch (dbError) {
            console.error("Database error:", dbError);
            // Use local storage as fallback
            const storedWidgets = localStorage.getItem("enabledWidgets");
            if (storedWidgets) {
              try {
                const parsedWidgets = JSON.parse(storedWidgets);
                if (Array.isArray(parsedWidgets) && parsedWidgets.length > 0) {
                  setWidgets(parsedWidgets);
                  console.log("Using local storage widgets (after DB error):", parsedWidgets);
                } else {
                  setWidgets(DEFAULT_WIDGETS);
                }
              } catch (e) {
                console.error("Error parsing local storage widgets:", e);
                setWidgets(DEFAULT_WIDGETS);
              }
            } else {
              console.log("No local storage widgets, using defaults after DB error");
              setWidgets(DEFAULT_WIDGETS);
            }
          }
        } else {
          // Use local storage for non-authenticated users
          const storedWidgets = localStorage.getItem("enabledWidgets");
          if (storedWidgets) {
            try {
              const parsedWidgets = JSON.parse(storedWidgets);
              if (Array.isArray(parsedWidgets) && parsedWidgets.length > 0) {
                console.log("Using local storage widgets for guest:", parsedWidgets);
                setWidgets(parsedWidgets);
              } else {
                console.log("Empty widgets in local storage for guest, using defaults");
                setWidgets(DEFAULT_WIDGETS);
                localStorage.setItem("enabledWidgets", JSON.stringify(DEFAULT_WIDGETS));
              }
            } catch (e) {
              console.error("Failed to parse stored widgets for guest", e);
              setWidgets(DEFAULT_WIDGETS);
              localStorage.setItem("enabledWidgets", JSON.stringify(DEFAULT_WIDGETS));
            }
          } else {
            console.log("No local storage widgets for guest, using defaults");
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
    if (!initialLoadDone || !enabledWidgets) return; // Avoid saving during initial load
    
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
            // Using upsert with onConflict to handle both insert and update cases
            const { error } = await supabase
              .from('user_widgets')
              .upsert({
                user_id: user.id,
                enabled_widgets: enabledWidgets,
                updated_at: new Date().toISOString()
              }, { 
                onConflict: 'user_id'
              });
              
            if (error) {
              console.error("Error saving widgets to database:", error);
              throw error;
            }
            
            console.log("Successfully saved widgets to database for user:", user.id);
          } catch (dbError) {
            console.error("Database error while saving widgets:", dbError);
            toast({
              title: "Warning",
              description: "Your widget preferences were saved locally but not to your account",
              variant: "default",
            });
          }
        }
      } catch (error: any) {
        console.error("Error saving widgets:", error);
        toast({
          title: "Warning",
          description: "Your widget preferences were saved locally but not to your account",
          variant: "default",
        });
      }
    };

    // Skip the first render and only save when loading is finished
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
