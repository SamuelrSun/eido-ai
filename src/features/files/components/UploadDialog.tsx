// src/features/files/components/UploadDialog.tsx
import { useState, ChangeEvent } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (files: FileList) => void;
}

export const UploadDialog = ({
  isOpen,
  onClose,
  onFileSelect,
}: UploadDialogProps) => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files);
    } else {
      setSelectedFiles(null);
    }
  };

  const handleUploadClick = () => {
    if (selectedFiles && selectedFiles.length > 0) {
      onFileSelect(selectedFiles); 
      onClose(); 
      setSelectedFiles(null); 
    } else {
      toast({
        title: "No files selected",
        description: "Please select one or more files to upload.",
        variant: "destructive",
      });
    }
  };

  const handleDialogStateChange = (open: boolean) => {
    if (!open) {
      setSelectedFiles(null); 
    }
    onClose(); 
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogStateChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload files to your current folder. Supported formats include PDF,
            DOCX, PPTX, TXT, JPG, and PNG.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <p className="mb-2 text-gray-600">
              <span className="font-semibold">Drop files here</span> or click to
              upload
            </p>
            <p className="text-xs text-gray-500 mb-4">Maximum 50MB per file</p>
            <input
              type="file"
              className="hidden"
              id="file-upload-input-dialog-unique-v4" // Changed ID again for absolute certainty
              onChange={handleFileChange}
              multiple
            />
            <label htmlFor="file-upload-input-dialog-unique-v4">
              <Button variant="outline" className="mt-2" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Select Files
                </span>
              </Button>
            </label>
          </div>
          {selectedFiles && selectedFiles.length > 0 && (
            <div className="mt-2 text-sm">
              <p className="font-medium mb-1">Selected files ({selectedFiles.length}):</p>
              <ul className="list-disc pl-5 max-h-24 overflow-y-auto bg-muted/50 p-2 rounded-md">
                {Array.from(selectedFiles).map(file => (
                  <li key={file.name + '-' + file.lastModified + '-' + file.size} className="truncate" title={file.name}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* The DialogFooter and its buttons. This structure is standard. */}
        <DialogFooter className="sm:justify-between"> {/* Added sm:justify-between for clarity, can be sm:justify-end */}
          <Button variant="outline" onClick={() => handleDialogStateChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUploadClick} 
            disabled={!selectedFiles || selectedFiles.length === 0}
            className="mt-2 sm:mt-0" // Ensure spacing on small screens if they stack
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Selected Files
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
