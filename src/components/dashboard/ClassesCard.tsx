// src/components/dashboard/ClassesCard.tsx
import React from 'react';
import ShimmerButton from '@/components/ui/ShimmerButton';
import { ArrowRight } from 'lucide-react';
import { ClassesDemo } from './ClassesDemo';
import { ClassConfig } from '@/services/classOpenAIConfig';

interface ClassesCardProps {
  onClick: () => void;
  classes: (ClassConfig & { files: number; size: string; is_owner: boolean; is_shared: boolean; })[];
  isLoading: boolean;
  // --- MODIFICATION: Added a new prop for handling clicks on individual class cards ---
  onClassClick: (classData: ClassConfig) => void;
}

export const ClassesCard: React.FC<ClassesCardProps> = ({ onClick, classes, isLoading, onClassClick }) => {
  return (
    <section className="relative flex flex-col rounded-lg p-6 border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
      <div className="flex flex-col gap-y-3">
        {/* --- MODIFICATION: Renamed title --- */}
        <h2 className="text-2xl font-bold text-neutral-100">
          Classes
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
          {/* --- MODIFICATION: Updated button text --- */}
          Go to Classes
          <ArrowRight className="ml-2 h-4 w-4" />
        </ShimmerButton>

        <div className="h-56 w-full">
           {/* --- MODIFICATION: Pass the new onClassClick handler to the demo --- */}
           <ClassesDemo classes={classes} isLoading={isLoading} onClassClick={onClassClick} />
        </div>
      </div>
    </section>
  );
};