// src/components/layout/Header.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

/**
 * Header component for consistent navigation across the application.
 * It centralizes the navigation links and applies the desired styling.
 */
export const Header = () => {
  const location = useLocation();
  const navLinks = [
    { to: "/", label: "Dashboard" },
    { to: "/classes", label: "Classes", state: { reset: true } },
    { to: "/calendar", label: "Calendar", state: { reset: true } },
    { to: "/community", label: "Community", state: { reset: true } },
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

        {/* --- Desktop Navigation Links --- */}
        <div className="hidden md:flex flex-row items-center gap-x-4 gap-y-0 lg:gap-x-6 justify-between">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
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

        {/* --- Mobile Navigation Dropdown --- */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {navLinks.map((link) => (
                <DropdownMenuItem key={link.to} asChild>
                  <Link
                    to={link.to}
                    state={link.state}
                    className={cn(
                      "w-full",
                      location.pathname === link.to && "font-bold"
                    )}
                  >
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
};