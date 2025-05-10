
import { X, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarHeaderProps {
  onClose: () => void;
  activeClassName: string | null;
}

export function SidebarHeader({ onClose, activeClassName }: SidebarHeaderProps) {
  return (
    <div className="flex flex-col p-4 border-b border-sidebar-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-md bg-purple-500 flex items-center justify-center mr-2">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-xl">Eido</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="md:hidden text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Display active class at the top under Eido */}
      {activeClassName && (
        <div className="py-1 px-1">
          <div className="text-sm font-medium text-sidebar-foreground truncate">
            {activeClassName}
          </div>
        </div>
      )}
    </div>
  );
}
