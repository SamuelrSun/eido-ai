// src/components/layout/AppLayout.tsx

import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { Header } from "./Header"; // Import the centralized Header component

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Store activeClass with its 'class_name' and 'class_id'
  const [activeClass, setActiveClass] = useState<{ class_id: string; class_name: string; } | null>(null);
  const location = useLocation();

  // Load active class from session storage and handle homepage clearing
  useEffect(() => {
    if (location.pathname === '/') {
      // Clear active class when on homepage
      setActiveClass(null);
      sessionStorage.removeItem('activeClass');
    } else {
      // Get active class from session storage on other pages
      const storedActiveClass = sessionStorage.getItem('activeClass');
      if (storedActiveClass) {
        try {
          // Parse the stored class data, expecting 'class_name' now
          const parsedClass: { class_id: string; class_name: string; } = JSON.parse(storedActiveClass);
          setActiveClass(parsedClass);
        } catch (e: unknown) { // Catch as unknown
          console.error("Error parsing stored active class", e);
        }
      }
    }
  }, [location.pathname]);

  return (
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
        {/* Unified Header for both mobile (when sidebar closed) and desktop */}
        {/* This header will be consistent across all pages using AppLayout */}
        <header className="flex-shrink-0">
          {/* Mobile menu button and Eido logo will still be here for mobile if sidebar is closed */}
          <div className="flex items-center px-4 py-2 border-b md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="flex items-center mx-auto">
              <div className="w-8 h-8 rounded-md flex items-center justify-center mr-2">
                <img
                  src="/eido-icon.png"
                  alt="Eido AI Logo"
                  className="h-8 w-8 object-contain"
                />
              </div>
              <h1 className="text-lg font-semibold">Eido</h1>
            </div>
            <div className="w-9"></div> {/* Empty div for centering */}
          </div>
          {/* The main Header component, always visible on desktop */}
          <div className="hidden md:block">
            <Header />
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
          <Toaster />
        </main>
      </div>
    </div>
  );
}
