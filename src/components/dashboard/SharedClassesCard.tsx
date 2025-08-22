// src/components/dashboard/SharedClassesCard.tsx
import React from 'react';
import ShimmerButton from '@/components/ui/ShimmerButton';
import { SharedClassesDemo } from './SharedClassesDemo';

interface SharedClassesCardProps {
  onClick: () => void;
}

export const SharedClassesCard: React.FC<SharedClassesCardProps> = ({ onClick }) => {
  return (
    <section 
      className="relative grid md:grid-cols-2 gap-8 items-center rounded-lg p-6 md:p-8 overflow-hidden border border-neutral-800 bg-neutral-900"
    >
      {/* Left side: Text Content */}
      <div className="flex flex-col gap-y-4">
        <h2 className="text-3xl font-bold text-neutral-100">
          Shared Classes
        </h2>
        
        <p className="text-sm text-neutral-400 max-w-md">
          Invite classmates to build a knowledge base together. Share notes, slides, and study materials in one central place.
        </p>

        <ShimmerButton 
          onClick={onClick} 
          className="w-fit mt-2 bg-transparent border border-neutral-500 text-neutral-300 hover:bg-neutral-800/80 hover:border-neutral-600 hover:text-neutral-100"
        >
          Create Shared Class
        </ShimmerButton>
      </div>

      {/* Right side: Coded Demo */}
      <div className="hidden md:block h-full min-h-[180px]">
        <SharedClassesDemo />
      </div>
    </section>
  );
};