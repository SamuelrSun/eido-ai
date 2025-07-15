// src/components/layout/Header.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Header component for consistent navigation across the application.
 * It centralizes the navigation links and applies the desired styling.
 */
export const Header = () => {
  const location = useLocation();
  const navLinks = [
    { to: "/", label: "Dashboard" },
    { to: "/classes", label: "Classes", state: { reset: true } }, // <-- ADD THIS STATE
    { to: "/calendar", label: "Calendar", state: { reset: true } },
    { to: "/console", label: "Console", state: { reset: true } },
  ];

  return (
    <div className="p-3"> {/* This div maintains the margin around the navbar, matching OraclePage */}
      <nav className="z-navigation flex w-full items-center justify-between rounded-lg border border-marble-400 bg-marble-100 px-4 py-3">
        {/* Application Logo */}
        <Link to="/">
          <div className="mr-3 flex items-baseline">
            <span className="text-logo lowercase font-variable ml-1 font-light text-green-700">eido ai</span>
          </div>
        </Link>
        {/* Navigation Links (visible on medium screens and up) */}
        <div className="hidden md:flex flex-row items-center gap-x-4 gap-y-0 lg:gap-x-6 justify-between">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            if (link.isExternal) {
              return (
                <a key={link.to} target="_blank" rel="noopener noreferrer" href={link.href}>
                  <p className="
                    text-base uppercase tracking-wider font-normal text-volcanic-800 hover:text-volcanic-900
                  ">
                    {link.label}
                  </p>
                </a>
              );
            }
            return (
              <Link key={link.to} to={link.to} state={link.state}> 
                <p className={cn(
                  "text-base uppercase tracking-wider hover:text-volcanic-900",
                  isActive ? "font-bold text-volcanic-900" 
                  : "font-normal text-volcanic-800"
                )}>
                  {link.label}
                </p>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};