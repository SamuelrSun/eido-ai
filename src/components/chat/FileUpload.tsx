
import { useState } from "react";
import { Upload, X, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
}

export function FileUpload({ onFileUpload }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const uploadedFile = e.dataTransfer.files[0];
      setFile(uploadedFile);
      onFileUpload(uploadedFile);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const uploadedFile = e.target.files[0];
      setFile(uploadedFile);
      onFileUpload(uploadedFile);
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  
  const removeFile = () => {
    setFile(null);
  };

  return (
    <div className="mb-6">
      {!file ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            isDragOver ? "border-cybercoach-teal bg-cybercoach-teal/5" : "border-gray-300"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleFileDrop}
        >
          <FileUp className="mx-auto h-10 w-10 text-gray-400 mb-2" />
          <p className="mb-2 text-sm text-gray-500">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">
            PDF, DOCX, PPTX or TXT (MAX. 10MB)
          </p>
          <input
            type="file"
            className="hidden"
            id="file-upload"
            accept=".pdf,.docx,.pptx,.txt"
            onChange={handleFileSelect}
          />
          <label htmlFor="file-upload">
            <Button variant="outline" className="mt-4" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </span>
            </Button>
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-cybercoach-teal/10 p-3 rounded-lg">
          <div className="flex items-center">
            <FileUp className="h-5 w-5 text-cybercoach-teal mr-2" />
            <span className="text-sm font-medium truncate max-w-[200px]">
              {file.name}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={removeFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
