// src/components/dashboard/DashboardSidebar.tsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DashboardSidebarProps {
  onLinkClick: (path: string) => void;
}

interface NavLinkProps {
  to: string;
  label: string;
  onLinkClick: (path: string) => void;
  isActive: boolean;
  soon?: boolean;
}

const NavItem: React.FC<NavLinkProps> = ({ to, label, onLinkClick, isActive, soon }) => (
  <span
    onClick={() => onLinkClick(to)}
    className={cn(
      "flex items-center justify-between py-1.5 px-3 rounded-md cursor-pointer transition-colors",
      isActive
        ? "bg-neutral-700 text-white font-medium"
        : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
    )}
  >
    <span className="flex items-center">
        {isActive && <div className="mr-3 h-1.5 w-1.5 rounded-full bg-blue-500"></div>}
        <span>{label}</span>
    </span>
    {soon && <Badge variant="secondary" className="text-xs bg-neutral-700 text-neutral-300">Soon</Badge>}
  </span>
);

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ onLinkClick }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="hidden h-full md:flex">
      {/* --- MODIFICATION: Updated border color to match header --- */}
      <div className="flex h-full flex-col justify-between overflow-y-auto bg-neutral-900 md:rounded-lg md:border border-foreground/20 md:w-42 w-full lg:w-56 px-2 md:py-4">
        <nav className="flex w-full flex-col gap-y-6">
          <div className="flex flex-col gap-y-1">
            <span className="px-3 text-xs font-semibold uppercase text-neutral-500">Platform</span>
            <NavItem to="/" label="Dashboard" onLinkClick={onLinkClick} isActive={currentPath === '/'} />
            <NavItem to="/classes" label="Classes" onLinkClick={onLinkClick} isActive={currentPath === '/classes'} />
            <NavItem to="/calendar" label="Calendar" onLinkClick={onLinkClick} isActive={currentPath === '/calendar'} />
          </div>
          <div className="flex flex-col gap-y-1">
            <span className="px-3 text-xs font-semibold uppercase text-neutral-500">Tools</span>
            <NavItem to="/oracle" label="Oracle" onLinkClick={onLinkClick} isActive={currentPath === '/oracle'} />
          </div>
          <div className="flex flex-col gap-y-1">
            <span className="px-3 text-xs font-semibold uppercase text-neutral-500">Settings</span>
            <NavItem to="/profile" label="Profile" onLinkClick={onLinkClick} isActive={currentPath === '/profile'} />
          </div>
        </nav>
      </div>
    </div>
  );
};
