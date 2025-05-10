
import React from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface MaterialsUploadSectionProps {
  onUpload: () => void;
}

export function MaterialsUploadSection({ onUpload }: MaterialsUploadSectionProps) {
  return (
    <div>
      <Label>Upload Materials (optional)</Label>
      <div className="mt-2">
        <Button 
          variant="outline" 
          className="w-full h-20 flex flex-col"
          onClick={onUpload}
        >
          <Upload className="h-6 w-6 mb-2" />
          <span>Upload syllabus, notes, readings, etc.</span>
          <span className="text-xs text-muted-foreground mt-1">Files will be processed for your class AI</span>
        </Button>
      </div>
    </div>
  );
}
