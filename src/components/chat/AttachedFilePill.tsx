// src/components/chat/AttachedFilePill.tsx
import React from 'react';
import { FileText, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AttachedFile {
  id: string;
  name: string;
  type: string; // Keep as string to handle various MIME types
  content: string; // Base64 encoded content
}

interface AttachedFilePillProps {
  file: AttachedFile;
  onRemove: (fileId: string) => void;
}

export const AttachedFilePill: React.FC<AttachedFilePillProps> = ({ file, onRemove }) => {
  const isImage = file.type.startsWith('image/');
  
  return (
    <div className="group relative flex items-center gap-2 pl-2 pr-1 py-1 rounded-md bg-stone-100 border border-stone-200 max-w-[200px] h-8">
      {isImage ? (
        <ImageIcon className="h-4 w-4 text-stone-500 flex-shrink-0" />
      ) : (
        <FileText className="h-4 w-4 text-stone-500 flex-shrink-0" />
      )}
      <span className="text-sm text-stone-700 truncate flex-grow" title={file.name}>
        {file.name}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-md flex-shrink-0 text-stone-400 hover:text-stone-700 hover:bg-stone-200 opacity-50 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation(); // Prevent any parent onClick handlers
          onRemove(file.id);
        }}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Remove {file.name}</span>
      </Button>
    </div>
  );
};