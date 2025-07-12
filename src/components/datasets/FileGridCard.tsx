// src/components/datasets/FileGridCard.tsx
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { FileType } from '@/features/files/types';
import { cn, formatFileSize } from '@/lib/utils';
import { FileText, Image as ImageIcon, Video, Loader2, AlertTriangle } from 'lucide-react';

interface FileGridCardProps {
  file: FileType;
  onClick: () => void;
  isSelected: boolean;
}

const FilePreview = ({ file }: { file: FileType }) => {
  // 1. Show a loading spinner if processing
  if (file.status === 'processing') {
    return <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />;
  }

  // 2. Show an error icon if processing failed
  if (file.status === 'error') {
    return <AlertTriangle className="h-12 w-12 text-destructive" />;
  }

  // 3. Prioritize the generated thumbnail for any file type if it exists
  if (file.thumbnail_url) {
    return <img src={file.thumbnail_url} alt={`Preview of ${file.name}`} className="w-full h-full object-cover object-top" />;
  }

  // 4. Fallback for native images if thumbnail failed but a file URL exists
  if (file.type.startsWith('image/') && file.url) {
    return <img src={file.url} alt={`Preview of ${file.name}`} className="w-full h-full object-cover object-top" />;
  }
  
  // 5. Fallback to icons for everything else
  if (file.type.startsWith('video/')) {
    return <Video className="h-12 w-12 text-gray-400" />;
  }
  return <FileText className="h-12 w-12 text-gray-400" />;
};

// src/components/datasets/FileGridCard.tsx

export const FileGridCard: React.FC<FileGridCardProps> = ({ file, onClick, isSelected }) => {
  const isImage = file.type.startsWith('image/');

  // --- 1. APPLY a fixed height to the main Card element ---
  return (
    <Card
      onClick={file.status === 'processing' ? undefined : onClick}
      className={cn(
        'group transition-all overflow-hidden flex flex-col h-[19rem]', // MODIFIED: Add a fixed height like 'h-56'
        file.status === 'processing' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        isSelected
          ? 'ring-2 ring-inset ring-stone-400 border-stone-400'
          : 'border-stone-200 hover:shadow-md hover:border-stone-300'
      )}
    >
      {/* --- 2. MODIFY the CardContent to correctly fill the remaining space --- */}
      <CardContent className="flex-1 flex items-center justify-center p-0 bg-stone-50 overflow-hidden min-h-0">
        <FilePreview file={file} />
      </CardContent>
      <CardFooter className="flex-col items-start p-3 bg-white border-t">
        <div className="w-full flex items-center gap-2">
            <div className="flex-shrink-0">
                {isImage ? <ImageIcon className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
            </div>
            <p className="text-sm font-medium text-stone-800 truncate" title={file.name}>
                {file.name}
            </p>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-[22px]">
            {file.status === 'processing' ? 'Processing...' : formatFileSize(file.size)}
        </p>
      </CardFooter>
    </Card>
  );
};