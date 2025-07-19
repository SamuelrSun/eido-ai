// src/components/oracle/upload-panel/MiniFolderCard.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { Folder as FolderIcon } from 'lucide-react';
import { FolderType } from '@/features/files/types';

interface MiniFolderCardProps {
  folder: FolderType;
  onClick: () => void;
}

export const MiniFolderCard: React.FC<MiniFolderCardProps> = ({ folder, onClick }) => (
    <Card onClick={onClick} className="p-2 cursor-pointer hover:bg-stone-50 transition-colors">
        <div className="flex items-center gap-2">
            <FolderIcon className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            <p className="text-xs font-medium truncate">{folder.name}</p>
        </div>
    </Card>
);