// src/components/classes/UploadDialog.tsx
import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { File, X, Loader2 } from 'lucide-react';
import ShimmerButton from '../ui/ShimmerButton';
import { useToast } from '@/hooks/use-toast';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
  isUploading: boolean;
}

export const UploadDialog: React.FC<UploadDialogProps> = ({ isOpen, onClose, onUpload, isUploading }) => {
  const [files, setFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles: File[] = [];
    const invalidFiles: File[] = [];
    for (const file of acceptedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(file);
      } else {
        validFiles.push(file);
      }
    }
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }
    if (invalidFiles.length > 0) {
      toast({
        title: "File Size Limit Exceeded",
        description: "Due to budget constraints, files above 5 MB are currently not supported. Sorry for the inconvenience!",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onDrop(Array.from(e.dataTransfer.files));
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onDrop(Array.from(e.target.files));
    }
  };
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadClick = () => {
    onUpload(files);
  };

  // Reset state when dialog is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFiles([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-neutral-900 border-neutral-800">
        <DialogHeader>
          <DialogTitle className="text-center text-white">Upload Files</DialogTitle>
          <DialogDescription className="text-center pt-2 text-neutral-400">
            Add files to the current directory. PDF, DOCX, and TXT are supported for indexing.
          </DialogDescription>
        </DialogHeader>
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="mt-4 border-2 border-dashed border-neutral-700 rounded-lg p-8 text-center"
        >
          <p className="mt-2 text-sm text-neutral-400">
            Drag & drop files here, or{' '}
            <label htmlFor="file-upload" className="text-blue-400 font-semibold cursor-pointer hover:underline">
              browse
            </label>
          </p>
          <input id="file-upload" type="file" className="hidden" multiple onChange={handleFileChange} />
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-2">
            <h4 className="text-sm font-medium text-neutral-300">Files to upload:</h4>
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between bg-neutral-800 p-2 rounded-md">
                <div className="flex items-center gap-2 overflow-hidden">
                    <File className="h-4 w-4 flex-shrink-0 text-neutral-400"/>
                    <span className="text-sm truncate text-neutral-200">{file.name}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-400 hover:text-white" onClick={() => removeFile(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={isUploading} className="bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white">Cancel</Button>
          <ShimmerButton onClick={handleUploadClick} disabled={files.length === 0 || isUploading}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? "Uploading..." : `Upload ${files.length} File(s)`}
          </ShimmerButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};