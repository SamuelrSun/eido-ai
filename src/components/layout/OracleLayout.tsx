// src/components/layout/OracleLayout.tsx
import React from 'react';

interface OracleLayoutProps {
  children: React.ReactNode;
}

const OracleLayout = ({ children }: OracleLayoutProps) => {
  return (
    // --- MODIFICATION START ---
    // The two nested divs with light backgrounds have been replaced by a single
    // dark-themed container that fills the available space.
    <div className="h-full w-full">
      <div className="mx-auto flex h-full w-full flex-1 flex-col rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden">
        {children}
      </div>
    </div>
    // --- MODIFICATION END ---
  );
};

export default OracleLayout;