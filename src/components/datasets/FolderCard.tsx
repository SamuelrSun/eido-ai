// src/components/datasets/FolderCard.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { Folder } from 'lucide-react';

interface FolderCardProps {
  name: string;
  files: number;
  size: string;
  isSelected: boolean;
  onClick: () => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ name, files, size, isSelected, onClick }) => {
  return (
    <div 
        onClick={onClick}
        className={cn(
        "p-3 rounded-lg cursor-pointer transition-all border",
        isSelected ? 'bg-stone-200 border-stone-400' : 'bg-stone-100 border-stone-200 hover:bg-stone-200 hover:border-stone-300'
    )}>
      <div className="flex items-center mb-2">
        <Folder className="h-5 w-5 mr-2 text-stone-600 flex-shrink-0" />
        <h3 className="font-semibold text-sm text-stone-700 truncate" title={name}>{name}</h3>
      </div>
      <div className="text-xs text-muted-foreground pl-7">
        <span>{files} Files</span>
        <span className="mx-2">•</span>
        <span>{size}</span>
      </div>
    </div>
  );
};