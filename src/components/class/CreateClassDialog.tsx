
import { 
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreateClassDialogContent } from "./dialog/CreateClassDialogContent";
import { useState } from "react";

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClassCreate: (classData: ClassData) => void;
}

export interface ClassData {
  title: string;
  description: string;
  color: string;
  enabledWidgets: string[];
  openAIConfig?: {
    apiKey?: string;
    vectorStoreId?: string;
    assistantId?: string;
  };
}

export function CreateClassDialog({ open, onOpenChange, onClassCreate }: CreateClassDialogProps) {
  // State to track form validity (for the create button)
  const [isFormValid, setIsFormValid] = useState(false);
  // Reference to form data for submission
  const [formData, setFormData] = useState<ClassData | null>(null);
  
  const handleSubmit = () => {
    if (formData && formData.title.trim()) {
      onClassCreate(formData);
      onOpenChange(false);
      setFormData(null);
      setIsFormValid(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setFormData(null);
    setIsFormValid(false);
  };

  const handleFormDataChange = (data: ClassData) => {
    setFormData(data);
    setIsFormValid(!!data.title.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Class</DialogTitle>
          <DialogDescription>
            Set up your new class with all the tools you'll need
          </DialogDescription>
        </DialogHeader>
        
        <CreateClassDialogContent 
          onClassCreate={handleFormDataChange}
          onCancel={handleCancel}
        />
        
        <DialogFooter className="flex justify-between sm:justify-between mt-4 pt-2 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isFormValid}>
            Create Class
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
