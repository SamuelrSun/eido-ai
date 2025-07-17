// src/components/layout/sidebar/SidebarNavigation.tsx
import { ReactNode } from "react";
import { NavLink } from "react-router-dom";

interface NavItem {
  icon: ReactNode;
  label: string;
  to: string;
  exact?: boolean;
}

interface SidebarNavigationProps {
  navItems: NavItem[];
}

export function SidebarNavigation({ navItems }: SidebarNavigationProps) {
  return (
    <ul className="space-y-2 px-2">
      {navItems.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.exact}
            // This state prop signals navigation to the Oracle page.
            state={item.to === '/oracle' ? { fromNavigation: true } : undefined}
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
  );
}
