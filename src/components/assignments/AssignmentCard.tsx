// src/components/assignments/AssignmentCard.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileQuestion } from 'lucide-react';

export type AssignmentStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface AssignmentCardProps {
  title: string;
  className: string;
  classColor: string;
  dueDate: string;
  status: AssignmentStatus;
  questionCount: number;
  onClick: () => void;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({ title, className, classColor, dueDate, status, questionCount, onClick }) => {
  const statusStyles: { [key in AssignmentStatus]: string } = {
    'Not Started': 'bg-red-100 text-red-800 border-red-200',
    'In Progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Completed': 'bg-green-100 text-green-800 border-green-200',
  };

  return (
    <Card
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden p-4 transition-all hover:shadow-md hover:border-stone-300 flex flex-col justify-between h-40"
    >
      <div className={cn("absolute left-0 top-0 h-full w-1.5", classColor)} />
      <div className="pl-3">
        <p className="text-xs text-muted-foreground truncate">{className}</p>
        <h3 className="font-semibold text-stone-800 truncate" title={title}>{title}</h3>
      </div>
      <div className="pl-3 mt-auto space-y-2">
         <div className="flex items-center text-xs text-muted-foreground">
            <FileQuestion className="mr-1.5 h-3 w-3" />
            <span>{questionCount} Questions</span>
         </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{dueDate}</p>
          <Badge className={cn("text-xs", statusStyles[status])}>
            {status}
          </Badge>
        </div>
      </div>
    </Card>
  );
};