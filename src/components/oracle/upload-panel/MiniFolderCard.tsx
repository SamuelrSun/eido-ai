// src/components/oracle/upload-panel/MiniFolderCard.tsx
import React from 'react';
import { Folder as FolderIcon } from 'lucide-react';
import { FolderType } from '@/features/files/types';
import { cn } from '@/lib/utils';

interface MiniFolderCardProps {
  folder: FolderType;
  onClick: () => void;
}

export const MiniFolderCard: React.FC<MiniFolderCardProps> = ({ folder, onClick }) => (
    <div
        onClick={onClick}
        className={cn(
            "p-3 rounded-lg cursor-pointer border relative",
            'bg-neutral-900 border-neutral-800 hover:border-blue-500'
        )}
    >
        <div className="flex items-center gap-2">
            <FolderIcon className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            <p className="text-xs font-medium text-neutral-200 truncate">{folder.name}</p>
        </div>
    </div>
);