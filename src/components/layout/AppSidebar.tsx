// src/components/layout/AppSidebar.tsx
import { Home, CalendarDays, Terminal, Compass } from "lucide-react"; // Using Compass for Oracle
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarAccount } from "./sidebar/SidebarAccount";

interface AppSidebarProps {
  onClose: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const { user, loading, activeClassName } = useSidebarState();

  const navItems = [
    {
      icon: <Home className="mr-2 h-5 w-5" />,
      label: "Dashboard",
      to: "/",
      exact: true,
      section: "Platform",
    },
    {
      icon: <CalendarDays className="mr-2 h-5 w-5" />,
       label: "Datasets",
      to: "/datasets",
      exact: false,
      section: "Platform",
    },
    {
      icon: <Compass className="mr-2 h-5 w-5" />, // Using a more appropriate icon for Oracle
      label: "Oracle",
      to: "/oracle",
      exact: false,
      section: "Tools",
    },
    
  ];

  return (
    <div className="font-roboto flex flex-col h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <SidebarHeader onClose={onClose} activeClassName={activeClassName} />

      <nav className="flex-1 overflow-auto py-4">
        <div className="px-4 py-2">
          <h3 className="text-xs font-semibold text-sidebar-foreground/70 uppercase">
           Platform
          </h3>
        </div>
        <SidebarNavigation
          navItems={navItems.filter((item) => item.section === "Platform")}
        />

        <div className="pt-4 px-4 py-2">
          <h3 className="text-xs font-semibold text-sidebar-foreground/70 uppercase">
           Tools
          </h3>
        </div>
        <SidebarNavigation
          navItems={navItems.filter((item) => item.section === "Tools")}
        />
      </nav>

      <div className="mt-auto border-t border-sidebar-border/50 px-2 py-4">
        <SidebarAccount loading={loading} user={user} />
       </div>
    </div>
  );
}