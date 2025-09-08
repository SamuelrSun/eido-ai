// src/components/oracle/upload-panel/MiniFileCard.tsx
import React from 'react';
import { FileText as FileIcon } from 'lucide-react';
import { FileType } from '@/features/files/types';
import { formatFileSize } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface MiniFileCardProps {
  file: FileType;
}

export const MiniFileCard: React.FC<MiniFileCardProps> = ({ file }) => (
    <div className={cn("p-3 rounded-lg border bg-neutral-900 border-neutral-800")}>
        <div className="flex items-center gap-2">
            <FileIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <a
                href={`/api/serve-file?id=${file.file_id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()} 
                className="text-xs font-medium text-neutral-200 truncate hover:underline"
                title={`Open ${file.name}`}
            >
                {file.name}
            </a>
        </div>
        <p className="text-[10px] text-neutral-400 mt-1 pl-6">{formatFileSize(file.size)}</p>
    </div>
);