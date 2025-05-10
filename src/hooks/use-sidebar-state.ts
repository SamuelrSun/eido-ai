
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClassWidgets } from "@/hooks/use-class-widgets";
import { WidgetType } from "@/hooks/use-widgets";

export function useSidebarState() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isWidgetsDialogOpen, setIsWidgetsDialogOpen] = useState(false);
  const [activeClassName, setActiveClassName] = useState<string | null>(null);
  const location = useLocation();
  const { enabledWidgets, isLoading: widgetsLoading } = useClassWidgets();
  
  // Load user and auth state
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user || null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    
    // Get active class name from session storage
    const activeClass = sessionStorage.getItem('activeClass');
    if (activeClass) {
      try {
        const parsedClass = JSON.parse(activeClass);
        setActiveClassName(parsedClass.title);
      } catch (e) {
        console.error("Error parsing active class:", e);
      }
    }
    
    return () => subscription.unsubscribe();
  }, []);

  // Update active class name when location changes
  useEffect(() => {
    if (location.pathname === '/') {
      setActiveClassName(null);
    } else {
      const activeClass = sessionStorage.getItem('activeClass');
      if (activeClass) {
        try {
          const parsedClass = JSON.parse(activeClass);
          setActiveClassName(parsedClass.title);
        } catch (e) {
          console.error("Error parsing active class:", e);
        }
      }
    }
  }, [location.pathname]);

  return {
    user,
    loading,
    isWidgetsDialogOpen,
    setIsWidgetsDialogOpen,
    activeClassName,
    enabledWidgets,
    widgetsLoading
  };
}
