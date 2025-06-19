// src/hooks/use-sidebar-state.ts
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
// Removed: import { useClassWidgets } from "@/hooks/use-class-widgets";
// Removed: import { WidgetType } from "@/hooks/use-widgets";
import type { User } from "@supabase/supabase-js";

export function useSidebarState() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Removed: const [isWidgetsDialogOpen, setIsWidgetsDialogOpen] = useState(false);
  const [activeClassName, setActiveClassName] = useState<string | null>(null);
  const location = useLocation();
  // Removed: const { enabledWidgets, isLoading: widgetsLoading } = useClassWidgets(); // No longer used

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
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    
    // Get active class name from session storage
    const activeClass = sessionStorage.getItem('activeClass');
    if (activeClass) {
      try {
        const parsedClass: { class_id: string; class_name: string; } = JSON.parse(activeClass);
        setActiveClassName(parsedClass.class_name);
      } catch (e: unknown) {
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
          const parsedClass: { class_id: string; class_name: string; } = JSON.parse(activeClass);
          setActiveClassName(parsedClass.class_name);
        } catch (e: unknown) {
          console.error("Error parsing active class:", e);
        }
      }
    }
  }, [location.pathname]);

  return {
    user,
    loading,
    // Removed: isWidgetsDialogOpen,
    // Removed: setIsWidgetsDialogOpen,
    activeClassName,
    // Removed: enabledWidgets,
    // Removed: widgetsLoading
  };
}