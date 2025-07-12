// src/components/datasets/UploadDialog.tsx
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
import { UploadCloud, File, X, Loader2 } from 'lucide-react';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
  isUploading: boolean;
}

export const UploadDialog: React.FC<UploadDialogProps> = ({ isOpen, onClose, onUpload, isUploading }) => {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

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
      <DialogContent>
        <DialogHeader>
          {/* 1. Centered the DialogTitle */}
          <DialogTitle className="text-center">Upload Files</DialogTitle>
          {/* 2. Centered the DialogDescription and added padding */}
          <DialogDescription className="text-center pt-2">
            Add files to the current directory. PDF, DOCX, and TXT are supported for indexing.
          </DialogDescription>
        </DialogHeader>
        
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="mt-4 border-2 border-dashed border-stone-300 rounded-lg p-8 text-center"
        >
          <UploadCloud className="mx-auto h-12 w-12 text-stone-400" />
          <p className="mt-2 text-sm text-muted-foreground">
            Drag & drop files here, or{' '}
            <label htmlFor="file-upload" className="text-primary font-semibold cursor-pointer hover:underline">
              browse
            </label>
          </p>
          <input id="file-upload" type="file" className="hidden" multiple onChange={handleFileChange} />
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
            <h4 className="text-sm font-medium">Files to upload:</h4>
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between bg-stone-100 p-2 rounded-md">
                <div className="flex items-center gap-2 overflow-hidden">
                    <File className="h-4 w-4 flex-shrink-0"/>
                    <span className="text-sm truncate">{file.name}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleUploadClick} disabled={files.length === 0 || isUploading}>
            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isUploading ? "Uploading..." : `Upload ${files.length} File(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};