// src/components/classes/FolderCard.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { Folder } from 'lucide-react';

interface FolderCardProps {
  folderName: string;
  files: number;
  size: string;
  isSelected: boolean;
  onClick: () => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ folderName, files, size, isSelected, onClick }) => {
  return (
    <div
        onClick={onClick}
        className={cn(
        "p-3 rounded-lg cursor-pointer transition-all border",
        isSelected 
            ? 'bg-neutral-800 border-neutral-600' // MODIFIED: Selected state
            : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700' // MODIFIED: Default state
    )}>
      <div className="flex items-center mb-2">
        <Folder className="h-5 w-5 mr-2 text-yellow-500 flex-shrink-0" /> {/* MODIFIED: Icon color */}
        <h3 className="font-semibold text-sm text-neutral-200 truncate" title={folderName}>{folderName}</h3> {/* MODIFIED: Text color */}
      </div>
      <div className="text-xs text-neutral-400 pl-7"> {/* MODIFIED: Text color */}
        <span>{files} Files</span>
        <span className="mx-2">•</span>
        <span>{size}</span>
      </div>
    </div>
  );
};