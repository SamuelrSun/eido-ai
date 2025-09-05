// src/components/dashboard/OracleCard.tsx
import React from 'react';
import ShimmerButton from '@/components/ui/ShimmerButton';
import { ArrowRight } from 'lucide-react';
import { OracleChatDemo } from './OracleChatDemo'; // Import the new demo component

interface OracleCardProps {
  onClick: () => void;
}

export const OracleCard: React.FC<OracleCardProps> = ({ onClick }) => {
  return (
    <section className="relative flex flex-col rounded-lg p-6 border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
      <div className="flex flex-col gap-y-3">
        <h2 className="text-2xl font-bold text-neutral-100">
          Oracle
        </h2>
        
        <p className="text-sm text-neutral-400 max-w-md">
          Get instant, cited answers from your course content. Plus, install the Chrome extension to access Oracle from anywhere.
        </p>
      </div>

      <div className="flex-grow" />

      <div className="mt-6 flex flex-col gap-4">
        <ShimmerButton 
          onClick={onClick} 
          className="w-fit border border-blue-500 bg-blue-950/80 text-neutral-100 hover:border-blue-400"
        >
          Go to Oracle
          <ArrowRight className="ml-2 h-4 w-4" />
        </ShimmerButton>

        {/* --- MODIFICATION: Removed the hard border from this container --- */}
        <div className="h-56 w-full overflow-hidden bg-neutral-900/50 rounded-md">
          <OracleChatDemo />
        </div>
      </div>
    </section>
  );
};