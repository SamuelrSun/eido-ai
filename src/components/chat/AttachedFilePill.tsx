// src/components/chat/AttachedFilePill.tsx
import React from 'react';
import { FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AttachedFile {
  id: string;
  name: string;
  type: string;
  content: string; // Base64 encoded content
}

interface AttachedFilePillProps {
  file: AttachedFile;
  onRemove: (fileId: string) => void;
}

export const AttachedFilePill: React.FC<AttachedFilePillProps> = ({ file, onRemove }) => {
  return (
    <div className={cn(
      "group relative inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium transition-colors max-w-48 h-7",
      "bg-neutral-700/50 border border-neutral-600 text-neutral-300"
    )}>
      <FileText size={14} className="text-neutral-400 flex-shrink-0" />
      <span className="truncate" title={file.name}>
        {file.name}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 rounded-full flex-shrink-0 text-neutral-400 hover:text-white hover:bg-neutral-600/50"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(file.id);
        }}
      >
        <X className="h-3.5 w-3.5" />
        <span className="sr-only">Remove {file.name}</span>
      </Button>
    </div>
  );
};