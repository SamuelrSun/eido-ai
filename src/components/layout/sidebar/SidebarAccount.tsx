
import { NavLink } from "react-router-dom";
import { LogIn } from "lucide-react";

interface SidebarAccountProps {
  loading: boolean;
  user: any;
}

export function SidebarAccount({ loading, user }: SidebarAccountProps) {
  if (loading) {
    return null; // Don't render anything while loading
  }
  
  if (!user) {
    return (
      <NavLink
        to="/auth"
        className={({ isActive }) => 
          `flex items-center px-4 py-2 rounded-md transition-colors ${
            isActive 
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          }`
        }
      >
        <LogIn className="mr-2 h-5 w-5" />
        <span>Sign In</span>
      </NavLink>
    );
  }
  
  return (
    <NavLink 
      to="/account"
      className={({ isActive }) => 
        `flex items-center p-2 rounded-md transition-colors ${
          isActive 
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
        }`
      }
    >
      <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
        <span className="text-xs font-medium">{user.email?.charAt(0).toUpperCase() || "U"}</span>
      </div>
      <div className="ml-2 overflow-hidden">
        <p className="font-medium truncate">{user.email}</p>
        <p className="text-xs opacity-70 truncate">Signed In</p>
      </div>
    </NavLink>
  );
}
