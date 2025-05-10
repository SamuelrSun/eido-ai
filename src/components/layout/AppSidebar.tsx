
import { 
  MessageCircle,
  Home,
  Search,
  BookOpen,
  SquareCheck,
  Calendar,
  Database,
  FileInput
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddWidgetsDialog } from "@/components/widgets/AddWidgetsDialog";
import { WidgetType } from "@/hooks/use-widget-base";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarWidgets } from "./sidebar/SidebarWidgets";
import { SidebarAccount } from "./sidebar/SidebarAccount";

interface AppSidebarProps {
  onClose: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const navigate = useNavigate();
  const { 
    user, 
    loading, 
    isWidgetsDialogOpen, 
    setIsWidgetsDialogOpen,
    activeClassName,
    enabledWidgets,
    widgetsLoading
  } = useSidebarState();

  // Define all navigation items - core features
  const coreNavItems = [
    {
      icon: <Home className="mr-2 h-5 w-5" />,
      label: "Home",
      to: "/",
      exact: true
    },
    {
      icon: <Calendar className="mr-2 h-5 w-5" />,
      label: "Calendar",
      to: "/calendar",
      exact: false
    }
  ];
  
  const widgetNavItems = [
    {
      icon: <Search className="mr-2 h-5 w-5" />,
      label: "Super Tutor",
      to: "/super-tutor",
      widgetId: "supertutor" as WidgetType
    },
    {
      icon: <Database className="mr-2 h-5 w-5" />,
      label: "Database",
      to: "/database",
      widgetId: "database" as WidgetType
    },
    {
      icon: <BookOpen className="mr-2 h-5 w-5" />,
      label: "Flashcards",
      to: "/flashcards",
      widgetId: "flashcards" as WidgetType
    },
    {
      icon: <SquareCheck className="mr-2 h-5 w-5" />,
      label: "Quizzes",
      to: "/quizzes",
      widgetId: "quizzes" as WidgetType
    },
    {
      icon: <FileInput className="mr-2 h-5 w-5" />,
      label: "Practice",
      to: "/practice",
      widgetId: "practice" as WidgetType
    }
  ];
  
  // Filter widget nav items by enabled widgets for the current class
  const visibleWidgetNavItems = widgetNavItems.filter(item => 
    enabledWidgets.includes(item.widgetId)
  );

  return (
    <div className="flex flex-col h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <SidebarHeader onClose={onClose} activeClassName={activeClassName} />
      
      <nav className="flex-1 overflow-auto py-4">
        <SidebarNavigation navItems={coreNavItems} />
        
        <SidebarWidgets
          activeClassName={activeClassName}
          widgetNavItems={visibleWidgetNavItems}
          isLoading={widgetsLoading}
          onAddWidgetsClick={() => setIsWidgetsDialogOpen(true)}
        />
      </nav>
      
      <div className="mt-auto border-t border-sidebar-border/50 px-2 py-4">
        <SidebarAccount loading={loading} user={user} />
      </div>
      
      {/* Add Widgets Dialog */}
      <AddWidgetsDialog 
        open={isWidgetsDialogOpen} 
        onOpenChange={setIsWidgetsDialogOpen} 
        classMode={true}
        currentClassName={activeClassName || ""}
      />
    </div>
  );
}
