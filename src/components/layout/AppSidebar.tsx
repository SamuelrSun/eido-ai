
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  FileText, 
  Settings,
  X
} from "lucide-react";

interface AppSidebarProps {
  onClose: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const navItems = [
    {
      icon: <MessageCircle className="mr-2 h-5 w-5" />,
      label: "Cybersecurity Coach",
      to: "/",
      exact: true
    },
    {
      icon: <FileText className="mr-2 h-5 w-5" />,
      label: "Policy Center",
      to: "/policy-center"
    },
    {
      icon: <Settings className="mr-2 h-5 w-5" />,
      label: "Admin Panel",
      to: "/admin"
    }
  ];

  return (
    <div className="flex flex-col h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-md bg-cybercoach-teal flex items-center justify-center mr-2">
            <span className="font-bold text-white">CB</span>
          </div>
          <span className="font-semibold text-xl">CyberCoach</span>
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
      
      <nav className="flex-1 overflow-auto py-4">
        <ul className="space-y-2 px-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.exact}
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
      </nav>
      
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-xs font-medium">UN</span>
          </div>
          <div className="ml-2">
            <p className="font-medium">User Name</p>
            <p className="text-xs opacity-70">Security Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
