// src/features/files/components/UploadProgressToast.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, ChevronUp, ChevronDown, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface UploadingFile {
  id: string; // A unique temporary ID for the upload batch
  name: string;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  errorMessage?: string;
}

interface UploadProgressToastProps {
  files: UploadingFile[];
  onClear: () => void;
}

const StatusIcon = ({ status }: { status: UploadingFile['status'] }) => {
  switch (status) {
    case 'pending':
    case 'uploading':
    case 'processing':
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    case 'complete':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return null;
  }
};

export const UploadProgressToast: React.FC<UploadProgressToastProps> = ({ files, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (files.length > 0) {
      setIsVisible(true);
    }
  }, [files]);

  const completedCount = files.filter(f => f.status === 'complete').length;
  const inProgress = files.some(f => f.status === 'pending' || f.status === 'uploading' || f.status === 'processing');
  const hasErrors = files.some(f => f.status === 'error');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    // If there are files, and none are in progress, and there are no errors, hide after 5 seconds.
    if (isVisible && files.length > 0 && !inProgress && !hasErrors) {
      timer = setTimeout(() => {
        setIsVisible(false);
        onClear(); // Clear the files from parent state after hiding
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [isVisible, inProgress, hasErrors, files.length, onClear]);
  
  const getHeaderText = () => {
    if (inProgress) {
        const processingCount = files.filter(f => f.status === 'processing').length;
        const uploadingCount = files.filter(f => f.status === 'uploading' || f.status === 'pending').length;
        if (processingCount > 0) return `Processing ${processingCount} of ${files.length}...`
        return `Uploading ${uploadingCount} of ${files.length}...`;
    }
    if (hasErrors) return `Upload complete with ${files.filter(f => f.status === 'error').length} error(s)`;
    return `${completedCount} of ${files.length} uploads complete`;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 right-4 z-50 w-80"
        >
          <Card className="shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between p-3 border-b">
              <p className="text-sm font-semibold">{getHeaderText()}</p>
              <div className="flex items-center">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsExpanded(!isExpanded)}>
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setIsVisible(false); onClear(); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="p-0 max-h-48 overflow-y-auto">
                <ul className="divide-y">
                  {files.map(file => (
                    <li key={file.id} className="p-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <StatusIcon status={file.status} />
                        <span className="truncate" title={file.name}>{file.name}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
