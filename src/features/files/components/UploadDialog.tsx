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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
              id="file-upload"
              onChange={(e) => e.target.files && onFileSelect(e.target.files)}
              multiple
            />
            <label htmlFor="file-upload">
              <Button variant="outline" className="mt-2" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Select Files
                </span>
              </Button>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 