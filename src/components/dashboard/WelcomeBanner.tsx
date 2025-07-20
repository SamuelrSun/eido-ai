// src/components/dashboard/WelcomeBanner.tsx
import React from 'react';
import type { User } from '@supabase/supabase-js';

interface WelcomeBannerProps {
  user: User | null;
  profile: { full_name: string | null } | null;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ user, profile }) => {
  const welcomeName = user ? profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User' : '';

  return (
    <div className="mb-8 border-b border-marble-400 bg-cover md:mb-10 flex-shrink-0 bg-mushroom-50 bg-[url(/images/whiteCellBackground.svg)]">
      <div className="flex w-full flex-col overflow-hidden md:flex-row">
        <div className="flex flex-col px-4 pt-10 pb-4 md:w-2/3 md:px-9 md:pt-16 lg:px-10">
          <p className="text-h3-m lg:text-h2 font-variable font-[420] mb-6 text-volcanic-700">
            Welcome{user ? `, ${welcomeName}` : ''}!
          </p>
          <h1 className="text-h5-m lg:text-h4 font-variable font-[420] mb-3 text-volcanic-900">What is Eido AI?</h1>
          <p className="text-p font-body pb-6 text-volcanic-900 md:pb-10">
            Eido AI is your educational copilot, allowing you to create smart, searchable knowledge bases built on your coursework. Get started with Eido AI by exploring the tools below.
          </p>
        </div>
        <div className="hidden items-end md:flex md:w-1/3">
          <div className="relative max-h-[250px] min-w-[300px] items-end ">
            <span style={{boxSizing: "border-box", display: "inline-block", overflow: "hidden", width: "initial", height: "initial", background: "none", opacity: 1, border: 0, margin: 0, padding: 0, position: "relative", maxWidth: "100%"}}>
              <img alt="" src="https://dashboard.cohere.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FdashboardPebbles.73d9a103.png&w=3840&q=75" decoding="async" style={{position: "absolute", top: 0, left: 0, bottom: 0, right: 0, boxSizing: "border-box", padding: 0, border: "none", margin: "auto", display: "block", width: 0, height: 0, minWidth: "100%", maxWidth: "100%", minHeight: "100%", maxHeight: "100%"}} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
