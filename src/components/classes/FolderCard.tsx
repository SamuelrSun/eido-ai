// src/components/classes/FolderCard.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface FolderCardProps {
  folderName: string;
  files: number;
  size: string;
  isSelected: boolean;
  onClick: () => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ folderName, files, size, isSelected, onClick }) => {
  // HSL value for the blue shimmer effect on hover.
  const shimmerColor = '221 83% 53%';

  // This handler updates CSS variables to move the shimmer effect with the cursor.
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { currentTarget: target } = e;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    target.style.setProperty("--x", `${x}px`);
    target.style.setProperty("--shimmer-color", shimmerColor);
  };

  return (
    <div
        onClick={onClick}
        onMouseMove={handleMouseMove}
        className={cn(
        // The 'shimmer-button' class provides the necessary relative positioning and transitions.
        "p-3 rounded-lg cursor-pointer border relative shimmer-button",
        isSelected 
            ? 'bg-neutral-800 border-neutral-600' 
            : 'bg-neutral-900 border-neutral-800 hover:border-blue-500'
    )}>
      <div className="flex items-center mb-2">
        <h3 className="font-semibold text-sm text-neutral-200 truncate" title={folderName}>{folderName}</h3>
      </div>
      <div className="text-xs text-neutral-400">
        <span>{files} Files</span>
        <span className="mx-2">•</span>
        <span>{size}</span>
      </div>
    </div>
  );
};