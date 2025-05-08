
import { ReactNode, useState } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { 
  Menu,
  ChevronDown
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface AppLayoutProps {
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentClass, setCurrentClass] = useState("ITP457: Advanced Network Security");

  const classes = [
    "ITP457: Advanced Network Security",
    "ITP216: Applied Python Concepts",
    "IR330: Politics of the World Economy"
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - fixed position instead of relative */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} fixed h-screen z-20`}>
        <AppSidebar onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Main content - adjust left margin to account for sidebar */}
      <div className="flex-1 min-w-0 overflow-auto gradient-background ml-0 md:ml-64">
        <header className="sticky top-0 z-10 flex items-center h-14 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Class dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="px-2 gap-1">
                <h1 className="text-lg font-semibold">{currentClass}</h1>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-full min-w-[250px] bg-white">
              {classes.map((className) => (
                <DropdownMenuItem 
                  key={className}
                  onClick={() => setCurrentClass(className)}
                  className="cursor-pointer"
                >
                  {className}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        
        <main className="container mx-auto py-6 px-4 md:px-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
