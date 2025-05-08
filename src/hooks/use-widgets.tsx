
import { createContext, useContext, useEffect, useState } from "react";

interface WidgetsContextType {
  enabledWidgets: string[];
  setEnabledWidgets: (widgets: string[]) => void;
}

const WidgetsContext = createContext<WidgetsContextType>({
  enabledWidgets: ["flashcards", "quizzes", "calendar"], // Default widgets
  setEnabledWidgets: () => {}
});

export function WidgetsProvider({ children }: { children: React.ReactNode }) {
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(["flashcards", "quizzes", "calendar"]);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("enabledWidgets");
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setEnabledWidgets(parsed);
        }
      } catch (error) {
        console.error("Failed to parse enabled widgets from localStorage", error);
      }
    }
  }, []);

  // Save to local storage when changed
  const updateEnabledWidgets = (widgets: string[]) => {
    setEnabledWidgets(widgets);
    localStorage.setItem("enabledWidgets", JSON.stringify(widgets));
  };

  return (
    <WidgetsContext.Provider value={{
      enabledWidgets,
      setEnabledWidgets: updateEnabledWidgets
    }}>
      {children}
    </WidgetsContext.Provider>
  );
}

export const useWidgets = () => useContext(WidgetsContext);
