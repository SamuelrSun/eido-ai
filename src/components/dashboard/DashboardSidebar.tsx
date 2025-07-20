// src/components/dashboard/DashboardSidebar.tsx
import React from 'react';

interface DashboardSidebarProps {
  onLinkClick: (path: string) => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ onLinkClick }) => {
  return (
    <div className="hidden h-full md:flex">
      <div className="flex h-full flex-col justify-between overflow-y-auto border-marble-400 bg-marble-100 md:rounded-lg md:border md:w-42 w-full lg:w-56 px-4 md:py-6">
        <nav className="hidden w-full flex-col gap-y-8 md:flex">
          <div className="flex flex-col gap-y-1">
            <span className="text-overline uppercase font-code font-bold text-dark-blue">Platform</span>
            <span onClick={() => onLinkClick('/')} className="text-p font-body flex items-center py-0.5 text-volcanic-900 cursor-pointer">
              <div className="mr-3 h-2 w-2 rounded-full bg-coral-500"></div>
              <span className="font-medium">Dashboard</span>
            </span>
            <span onClick={() => onLinkClick('/classes')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer">
              <span>Classes</span>
            </span>
            <span onClick={() => onLinkClick('/calendar')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer">
              <span>Calendar</span>
            </span>
            <span onClick={() => onLinkClick('/console')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer">
              <span>Console</span>
            </span>
          </div>
          <div className="flex flex-col gap-y-1">
            <span className="text-overline uppercase font-code font-bold text-dark-blue">Tools</span>
            <span onClick={() => onLinkClick('/oracle')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer">
              <span>Oracle</span>
            </span>
            <span onClick={() => onLinkClick('/assignments')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer">
              <span>Assignments</span>
            </span>
            <span onClick={() => onLinkClick('/codepad')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer">
              <span>Codepad</span>
            </span>
          </div>
          <div className="flex flex-col gap-y-1">
            <span className="text-overline uppercase font-code font-bold text-dark-blue">Settings</span>
            <span onClick={() => onLinkClick('/profile')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer">
              <span>Profile</span>
            </span>
            <span onClick={() => onLinkClick('/billing')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer">
              <span>Billing</span>
            </span>
          </div>
        </nav>
      </div>
    </div>
  );
};
