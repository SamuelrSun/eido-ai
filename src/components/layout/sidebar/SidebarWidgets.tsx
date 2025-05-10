
import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Loader2 } from "lucide-react";
import { WidgetType } from "@/hooks/use-widgets";

interface WidgetNavItem {
  icon: ReactNode;
  label: string;
  to: string;
  widgetId: WidgetType;
}

interface SidebarWidgetsProps {
  activeClassName: string | null;
  widgetNavItems: WidgetNavItem[];
  isLoading: boolean;
  onAddWidgetsClick: () => void;
}

export function SidebarWidgets({
  activeClassName,
  widgetNavItems,
  isLoading,
  onAddWidgetsClick
}: SidebarWidgetsProps) {
  return (
    <div className="pt-4">
      <div className="px-4 py-2 flex justify-between items-center">
        <h3 className="text-xs font-semibold text-sidebar-foreground/70 uppercase">
          {activeClassName ? "Class Widgets" : "Available Widgets"}
        </h3>
        {activeClassName && (
          <Button 
            onClick={onAddWidgetsClick}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 h-7 text-sidebar-foreground hover:text-primary hover:bg-sidebar-accent/80"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Add</span>
          </Button>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      ) : widgetNavItems.length > 0 ? (
        <ul className="space-y-2 px-2">
          {widgetNavItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => 
                  `flex items-center px-4 py-2 rounded-md transition-colors ${
                    isActive 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground px-4 py-2">
          {activeClassName 
            ? "No widgets added yet" 
            : "Select a class to use widgets"}
        </p>
      )}
    </div>
  );
}
