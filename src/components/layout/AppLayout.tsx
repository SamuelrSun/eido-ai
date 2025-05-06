
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - fixed position instead of relative */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} fixed h-screen z-20`}>
        <AppSidebar onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Main content - adjust left margin to account for sidebar */}
      <div className="flex-1 min-w-0 overflow-auto gradient-background ml-0 md:ml-64">
        <header className="sticky top-0 z-10 flex items-center h-14 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-2"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <h1 className="text-lg font-semibold">CyberCoach</h1>
        </header>
        
        <main className="container mx-auto py-6 px-4 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
