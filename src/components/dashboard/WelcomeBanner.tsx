// src/components/dashboard/WelcomeBanner.tsx
import React from 'react';
import type { User } from '@supabase/supabase-js';

interface WelcomeBannerProps {
  user: User | null;
  profile: { full_name: string | null } | null;
  onTutorialClick: () => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ user, profile, onTutorialClick }) => {
  const welcomeName = user ? profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User' : '';

  return (
    <div className="flex-shrink-0 p-6 md:p-8 border-b border-neutral-800">
      <div className="flex w-full flex-col">
        <p className="text-4xl md:text-5xl font-bold mb-3 text-neutral-100">
          Welcome{user ? `, ${welcomeName}` : ''}!
        </p>
        <h1 className="text-xl md:text-2xl font-medium mb-4 text-neutral-200">
          What is Eido AI?
        </h1>
        <p className="text-sm text-neutral-400 max-w-3xl">
          Eido is the educational copilot that transforms your coursework into a powerful suite of intelligent tools. Get started by{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onTutorialClick();
            }}
            className="underline text-blue-400 hover:text-blue-300"
          >
            visiting the tutorial
          </a>
          {" "}or exploring the tools below.
        </p>
      </div>
    </div>
  );
};