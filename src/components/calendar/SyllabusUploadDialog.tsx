// src/components/calendar/SyllabusUploadDialog.tsx
import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UploadCloud, File, Image as ImageIcon, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ClassConfig } from '@/services/classOpenAIConfig';

interface SyllabusUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[], classId: string) => void;
  classes: ClassConfig[];
}

export const SyllabusUploadDialog: React.FC<SyllabusUploadDialogProps> = ({ isOpen, onClose, onUpload, classes }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const handleFilesChange = useCallback((newFiles: FileList | null) => {
    if (newFiles) {
      setFiles(prev => [...prev, ...Array.from(newFiles)]);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesChange(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesChange(e.target.files);
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    handleFilesChange(event.clipboardData.files);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadClick = () => {
    if (files.length > 0 && selectedClassId) {
      onUpload(files, selectedClassId);
      setFiles([]);
      setSelectedClassId(null);
      onClose();
    }
  };

  const handleClose = () => {
    setFiles([]);
    setSelectedClassId(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Syllabus</DialogTitle>
          <DialogDescription>
            Select a class, then upload files (PDF, DOCX) or paste screenshots (PNG, JPG) to populate your calendar.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
            <Select onValueChange={setSelectedClassId}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a class for this syllabus..." />
                </SelectTrigger>
                <SelectContent>
                    {classes.map(c => <SelectItem key={c.class_id} value={c.class_id}>{c.class_name}</SelectItem>)}
                </SelectContent>
            </Select>

            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed border-stone-300 rounded-lg p-8 text-center transition-colors",
                isDragging && "border-stone-500 bg-stone-100"
              )}
            >
              <input id="file-upload" type="file" className="hidden" multiple onChange={handleFileSelect} accept=".pdf,.docx,.png,.jpg,.jpeg" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <UploadCloud className="mx-auto h-12 w-12 text-stone-400" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag & drop files here, or{' '}
                  <span className="text-stone-700 font-semibold hover:underline">
                    browse
                  </span>
                </p>
              </label>
            </div>

            <div className="relative my-2">
               <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-300" />
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-stone-500">OR</span>
                </div>
            </div>

            <Textarea 
                placeholder="Paste screenshots here..." 
                onPaste={handlePaste}
                rows={3}
            />
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Files to upload:</h4>
            <ScrollArea className="h-32">
                <div className="space-y-2 pr-4">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between bg-stone-100 p-2 rounded-md">
                        <div className="flex items-center gap-2 overflow-hidden">
                            {file.type.startsWith('image/') ? <ImageIcon className="h-4 w-4 flex-shrink-0 text-stone-500"/> : <File className="h-4 w-4 flex-shrink-0 text-stone-500"/>}
                            <span className="text-sm truncate" title={file.name}>{file.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
            </ScrollArea>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleUploadClick} disabled={files.length === 0 || !selectedClassId}>
            Upload {files.length > 0 && `(${files.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
