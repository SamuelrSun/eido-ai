// src/components/dashboard/OracleCard.tsx
import React from 'react';
import ShimmerButton from '@/components/ui/ShimmerButton';
import { OracleDemo } from './OracleDemo';

interface OracleCardProps {
  onClick: () => void;
}

export const OracleCard: React.FC<OracleCardProps> = ({ onClick }) => {
  return (
    <section 
      className="relative grid md:grid-cols-2 gap-8 items-center rounded-lg p-6 md:p-8 overflow-hidden border border-neutral-800 bg-neutral-900"
    >
      {/* Left side: Text Content */}
      <div className="flex flex-col gap-y-4">
        <span className="text-blue-400 bg-blue-950/60 border border-blue-500/30 flex w-fit items-center rounded px-3 py-1 text-xs font-medium">
            New
        </span>
        <h2 className="text-3xl font-bold text-neutral-100">
          Oracle
        </h2>
        
        <p className="text-sm text-neutral-400 max-w-md">
          Get instant, cited answers from your course content. Plus, install the Chrome extension to access Oracle from anywhere.
        </p>

        <ShimmerButton 
          onClick={onClick} 
          className="w-fit mt-2 bg-transparent border border-neutral-500 text-neutral-300 hover:bg-neutral-800/80 hover:border-neutral-600 hover:text-neutral-100"
        >
          Go to Oracle
        </ShimmerButton>
      </div>

      {/* Right side: Coded Demo with bleed effect */}
      <div className="hidden md:block h-56 -mr-8 -mb-8 lg:-mr-12 lg:-mb-12">
        <OracleDemo />
      </div>
    </section>
  );
};