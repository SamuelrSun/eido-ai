// src/components/dashboard/SharedClassesCard.tsx
import React from 'react';
import ShimmerButton from '@/components/ui/ShimmerButton';
import { SharedClassesDemo } from './SharedClassesDemo';
import { ArrowRight } from 'lucide-react';

interface SharedClassesCardProps {
  onClick: () => void;
}

export const SharedClassesCard: React.FC<SharedClassesCardProps> = ({ onClick }) => {
  return (
    // --- MODIFICATION: Removed flex-grow ---
    <section className="relative flex flex-col rounded-lg p-6 border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
      <div className="flex flex-col gap-y-3">
        <h2 className="text-2xl font-bold text-neutral-100">
          Shared Classes
        </h2>
        
        <p className="text-sm text-neutral-400 max-w-md">
          Invite classmates to build a knowledge base together. Share notes, slides, and study materials in one central place.
        </p>
      </div>

      <div className="flex-grow" />

      <div className="mt-6 flex flex-col gap-4">
        <ShimmerButton 
          onClick={onClick} 
          className="w-fit border border-blue-500 bg-blue-950/80 text-neutral-100 hover:border-blue-400"
        >
          Create or Join Class
          <ArrowRight className="ml-2 h-4 w-4" />
        </ShimmerButton>

        <div className="h-56 w-full">
          <SharedClassesDemo />
        </div>
      </div>
    </section>
  );
};