// src/components/layout/OracleLayout.tsx
import React from 'react';

interface OracleLayoutProps {
  children: React.ReactNode;
}

const OracleLayout = ({ children }: OracleLayoutProps) => {
  return (
    // This outer div provides the overall light gray background for the entire page
    <div className="h-full w-full bg-stone-100 p-3">
      {/* This inner div is the main white container with the border and rounded corners */}
      <div className="mx-auto flex h-full w-full flex-1 flex-col rounded-lg border bg-white">
        {children}
      </div>
    </div>
  );
};

export default OracleLayout;