// src/components/oracle/upload-panel/MiniFileCard.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { FileText as FileIcon } from 'lucide-react';
import { FileType } from '@/features/files/types';
import { formatFileSize } from '@/lib/utils';

interface MiniFileCardProps {
  file: FileType;
}

export const MiniFileCard: React.FC<MiniFileCardProps> = ({ file }) => (
    <Card className="p-2">
        <div className="flex items-center gap-2">
            <FileIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <p className="text-xs font-medium truncate">{file.name}</p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 pl-6">{formatFileSize(file.size)}</p>
    </Card>
);