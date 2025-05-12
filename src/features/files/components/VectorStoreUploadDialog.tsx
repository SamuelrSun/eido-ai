import { File, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SelectedItem } from "../types";

interface VectorStoreUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedItems: SelectedItem[];
  isUploading: boolean;
  uploadProgress: number;
}

export const VectorStoreUploadDialog = ({
  isOpen,
  onClose,
  onConfirm,
  selectedItems,
  isUploading,
  uploadProgress,
}: VectorStoreUploadDialogProps) => {
  const filesToUpload = selectedItems.filter(
    (item) => item.type === "file" && item.url
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload to Vector Store</DialogTitle>
          <DialogDescription>
            You are about to upload {filesToUpload.length} files to the OpenAI
            Vector Store. These files will be available for AI-powered features.
          </DialogDescription>
        </DialogHeader>

        {isUploading ? (
          <div className="py-6">
            <div className="mb-2 flex justify-between text-xs">
              <span>Uploading to Vector Store...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2 mb-4" />
            <p className="text-xs text-gray-500 text-center">
              This may take a few moments depending on the file size.
            </p>
          </div>
        ) : (
          <div className="py-4">
            <ul className="max-h-40 overflow-y-auto border rounded-lg divide-y">
              {filesToUpload.map((file) => (
                <li key={file.id} className="p-2 flex items-center">
                  <File className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="text-sm truncate">{file.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          {!isUploading && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={onConfirm}>
                <Upload className="h-4 w-4 mr-2" />
                Upload to Vector Store
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 