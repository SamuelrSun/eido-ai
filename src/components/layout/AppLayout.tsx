
import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Menu } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { WidgetsProvider } from "@/hooks/use-widgets";
import { ClassWidgetsProvider } from "@/hooks/use-class-widgets";

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeClass, setActiveClass] = useState<any>(null);

  // Load active class from session storage
  useEffect(() => {
    const storedActiveClass = sessionStorage.getItem('activeClass');
    if (storedActiveClass) {
      try {
        setActiveClass(JSON.parse(storedActiveClass));
      } catch (e) {
        console.error("Error parsing stored active class", e);
      }
    }
  }, []);

  return (
    <WidgetsProvider>
      <ClassWidgetsProvider 
        classId={activeClass?.title} 
        defaultWidgets={activeClass?.enabledWidgets || ["supertutor", "database"]}
      >
        <div className="flex h-screen overflow-hidden bg-background">
          {/* Mobile sidebar */}
          <div className="md:hidden">
            {isSidebarOpen && (
              <div 
                className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
            
            <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
              <AppSidebar onClose={() => setIsSidebarOpen(false)} />
            </div>
          </div>
          
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <AppSidebar onClose={() => {}} />
          </div>
          
          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile header */}
            <header className="flex items-center px-4 py-2 border-b md:hidden">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>
              <div className="flex items-center mx-auto">
                <div className="w-8 h-8 rounded-md bg-purple-500 flex items-center justify-center mr-2">
                  <span className="text-white font-bold">E</span>
                </div>
                <h1 className="text-lg font-semibold">Eido</h1>
              </div>
              <div className="w-9"></div> {/* Empty div for centering */}
            </header>
            
            {/* Content area */}
            <main className="flex-1 overflow-auto p-4 md:p-8">
              <Outlet />
              <Toaster />
            </main>
          </div>
        </div>
      </ClassWidgetsProvider>
    </WidgetsProvider>
  );
}
