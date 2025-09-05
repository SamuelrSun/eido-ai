// src/components/dashboard/ClassesDemo.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardClassCard } from './DashboardClassCard';
import { ClassConfig } from '@/services/classOpenAIConfig';
import { Loader2 } from 'lucide-react';

interface ClassesDemoProps {
  classes: (ClassConfig & { files: number; size: string; is_owner: boolean; is_shared: boolean; })[];
  isLoading: boolean;
  onClassClick: (classData: ClassConfig) => void;
}

export const ClassesDemo: React.FC<ClassesDemoProps> = ({ classes, isLoading, onClassClick }) => {
  return (
    <Card className="h-full border border-neutral-700/50 bg-neutral-900/50 relative overflow-hidden">
      <CardContent className="p-3 h-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
          </div>
        ) : classes.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 h-full overflow-y-auto">
            {classes.slice(0, 4).map((classItem) => (
              <DashboardClassCard
                key={classItem.class_id}
                className={classItem.class_name}
                files={classItem.files}
                size={classItem.size}
                isShared={classItem.is_shared}
                color={classItem.color}
                onClick={() => onClassClick(classItem)}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center text-sm text-neutral-400">
            <p>No classes yet. Click below to create one!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};