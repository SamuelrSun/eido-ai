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

export const Header = () => {
  const location = useLocation();
  // Removed the "Community" link from this array
  const navLinks = [
    { to: "/", label: "Dashboard" },
    { to: "/classes", label: "Classes", state: { reset: true } },
    { to: "/calendar", label: "Calendar", state: { reset: true } },
  ];

  return (
    <div className="p-3 font-roboto">
      <nav className="z-navigation flex w-full items-center justify-between rounded-lg border border-foreground/20 bg-background/50 backdrop-blur-xl px-4 py-2 shadow-lg">
        {/* Application Logo */}
        <Link to="/" className="flex items-center gap-3">
            <img src="/eido-icon.png" alt="Eido AI Logo" className="h-8 w-8 rounded-md" />
            <span className="text-[18px] font-semibold tracking-tight text-foreground">Eido AI</span>
        </Link>

        {/* --- Desktop Navigation Links --- */}
        <div className="hidden md:flex flex-row items-center gap-x-4 gap-y-0 lg:gap-x-8 justify-between">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link key={link.to} to={link.to} state={link.state}>
                <p className={cn(
                  "text-xs uppercase font-bold tracking-widest transition-colors",
                  isActive 
                  ? "text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
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
