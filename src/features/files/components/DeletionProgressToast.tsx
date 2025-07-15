// src/features/files/components/DeletionProgressToast.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, ChevronUp, ChevronDown, X, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface DeletingFile {
  id: string;
  name: string;
  status: 'pending' | 'deleting' | 'complete' | 'error';
  errorMessage?: string;
}

interface DeletionProgressToastProps {
  files: DeletingFile[];
  onClear: () => void;
}

const StatusIcon = ({ status }: { status: DeletingFile['status'] }) => {
  switch (status) {
    case 'pending':
    case 'deleting':
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    case 'complete':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Trash2 className="h-4 w-4 text-muted-foreground" />;
  }
};

export const DeletionProgressToast: React.FC<DeletionProgressToastProps> = ({ files, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (files.length > 0) {
      setIsVisible(true);
    }
  }, [files]);

  const completedCount = files.filter(f => f.status === 'complete').length;
  const inProgress = files.some(f => f.status === 'pending' || f.status === 'deleting');
  const hasErrors = files.some(f => f.status === 'error');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    // Hide the toast automatically 5 seconds after all operations are finished.
    if (isVisible && files.length > 0 && !inProgress) {
      timer = setTimeout(() => {
        setIsVisible(false);
        onClear(); // Clear the parent state after hiding
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [isVisible, inProgress, hasErrors, files.length, onClear]);

  const getHeaderText = () => {
    if (inProgress) {
      return `Deleting ${files.length} item(s)...`;
    }
    if (hasErrors) {
      const errorCount = files.filter(f => f.status === 'error').length;
      return `Deletion complete with ${errorCount} error(s)`;
    }
    return `${completedCount} of ${files.length} items deleted`;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 right-4 z-50 w-80" // Positioned on the bottom-right
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
