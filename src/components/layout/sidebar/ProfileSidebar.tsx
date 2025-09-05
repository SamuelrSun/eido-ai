// src/components/layout/sidebar/ProfileSidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const NavItem = ({ to, label, soon }: { to: string; label: string, soon?: boolean }) => {
    const commonClasses = "flex items-center justify-between py-1.5 px-3 rounded-md cursor-pointer transition-colors";
    const activeClasses = "bg-neutral-700 text-white font-medium";
    const inactiveClasses = "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200";

    return (
        <NavLink to={to}>
            {({ isActive }) => (
                <span className={cn(commonClasses, isActive ? activeClasses : inactiveClasses)}>
                    <span className="flex items-center">
                        {isActive && <div className="mr-3 h-1.5 w-1.5 rounded-full bg-blue-500"></div>}
                        {label}
                    </span>
                    {soon && <Badge variant="secondary" className="text-xs bg-neutral-700 text-neutral-300">Soon</Badge>}
                </span>
            )}
        </NavLink>
    );
};

export const ProfileSidebar = () => {
  return (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-neutral-900 rounded-lg border border-neutral-800 md:w-42 w-full lg:w-56 px-2 md:py-4">
      <nav className="flex w-full flex-col gap-y-6">
        <div className="flex flex-col gap-y-1">
          <span className="px-3 text-xs font-semibold uppercase text-neutral-500">Settings</span>
          <NavItem to="/profile" label="Profile" />
          <NavItem to="/billing" label="Billing" soon />
        </div>
      </nav>
    </div>
  );
};