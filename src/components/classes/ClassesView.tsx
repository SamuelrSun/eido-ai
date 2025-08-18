// src/components/classes/ClassesView.tsx
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassCard } from '@/components/classes/ClassCard';
import { ClassConfig } from '@/services/classOpenAIConfig';

interface ClassesViewProps {
  isLoading: boolean;
  // --- FIX: Add is_shared to the type definition ---
  classesWithStats: (ClassConfig & { files: number; size: string; is_owner: boolean; is_shared: boolean })[];
  onClassClick: (classData: ClassConfig) => void;
  onDeleteClassClick: (classData: ClassConfig) => void;
}

const SkeletonGrid = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-36 w-full" />
      </div>
    ))}
  </div>
);

export const ClassesView: React.FC<ClassesViewProps> = ({
  isLoading,
  classesWithStats,
  onClassClick,
  onDeleteClassClick,
}) => {
  return (
    <div className="space-y-4">
      <h2 className="text-sm uppercase font-semibold text-muted-foreground">Classes</h2>
      <Separator className="my-4" />
      {isLoading ? (
        <SkeletonGrid />
      ) : classesWithStats.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {classesWithStats.map((classItem) => (
            <ClassCard
              key={classItem.class_id}
              id={classItem.class_id}
              className={classItem.class_name}
              files={classItem.files}
              size={classItem.size}
              isSelected={false}
              isOwner={classItem.is_owner}
              // --- FIX: Pass the is_shared prop to the card ---
              isShared={classItem.is_shared}
              onClick={() => onClassClick(classItem)}
              onDelete={() => onDeleteClassClick(classItem)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No classes found. Click "New Class" or "Join Class" to get started.</p>
      )}
    </div>
  );
};