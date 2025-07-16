// In: src/components/calendar/ProcessingLoader.tsx

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface ProcessingLoaderProps {
  isOpen: boolean;
}

export const ProcessingLoader: React.FC<ProcessingLoaderProps> = ({ isOpen }) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent
        hideCloseButton // This prop will now work correctly
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center">Processing Syllabus</DialogTitle>
          <DialogDescription className="text-center">
            The AI is reading your files and extracting events. This may take a moment...
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-12 w-12 animate-spin text-stone-500" />
        </div>
      </DialogContent>
    </Dialog>
  );
};