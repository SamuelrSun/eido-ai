// src/components/class/CreateClassDialog.tsx
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
import { useState, useEffect } from "react";
// No longer directly calling classOpenAIConfigService from here for saving
// import { classOpenAIConfigService } from "@/services/classOpenAIConfig";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import type { WidgetType } from "@/hooks/use-widgets";

// This interface should be identical to the one used by CreateClassDialogContent
// and expected by HomePage's handleCreateClass.
// It's defined here for clarity within this component's scope.
interface OpenAIConfigForDialog {
  vectorStoreId?: string | null;
  assistantId?: string | null;
  // No apiKey
}

export interface ClassData {
  title: string;
  professor?: string | null;
  classTime?: string | null;
  classroom?: string | null;
  emoji?: string | null;
  enabledWidgets: WidgetType[];
  openAIConfig?: OpenAIConfigForDialog;
}

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClassCreate: (classData: ClassData) => void; // This prop now points to HomePage's handleCreateClass
}

const DEFAULT_CLASS_WIDGETS: WidgetType[] = ["supertutor", "database"];

export function CreateClassDialog({ open, onOpenChange, onClassCreate }: CreateClassDialogProps) {
  const [isFormValid, setIsFormValid] = useState(false);
  const [formData, setFormData] = useState<ClassData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // To disable button during parent's submission
  const { toast } = useToast();

  // Check for authenticated user
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error("Error checking auth in CreateClassDialog:", error);
      }
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Reset form when dialog closes or opens
  useEffect(() => {
    if (!open) {
      setFormData(null);
      setIsFormValid(false);
      setIsSubmitting(false); // Reset submitting state
    } else {
      // Initialize with empty/default data for a new class form
      setFormData({
        title: "",
        professor: "",
        classTime: "",
        classroom: "",
        emoji: "", // Let CreateClassDialogContent handle default emoji generation
        enabledWidgets: DEFAULT_CLASS_WIDGETS,
        openAIConfig: {
            vectorStoreId: "",
            assistantId: ""
        }
      });
      setIsFormValid(false); // Title will be empty initially
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!formData || !formData.title.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a title for your class.",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be signed in to create a class.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // The actual saving and provisioning is handled by onClassCreate (HomePage's handleCreateClass)
      await onClassCreate(formData);
      // HomePage's handleCreateClass will show its own success toast and close the dialog.
      // We might not need to do it here if onClassCreate handles onOpenChange(false).
      // For now, assume parent handles dialog closing on success.
    } catch (error) {
      // This catch block might not be reached if onClassCreate handles its own errors.
      // However, if onClassCreate re-throws or is not async-awaited properly by parent,
      // this could catch issues.
      console.error("Error during class creation process (dialog level):", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while trying to create the class.",
        variant: "destructive",
      });
    } finally {
      // Parent (HomePage) is now responsible for closing the dialog via onOpenChange
      // and resetting its own state. We reset isSubmitting here.
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  // This function is called by CreateClassDialogContent whenever its internal form data changes
  const handleFormDataChange = (data: ClassData) => {
    setFormData(data);
    setIsFormValid(!!data.title?.trim());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpenState) => {
        if (!isSubmitting) {
          onOpenChange(newOpenState);
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader className="text-left">
          <DialogTitle>Create New Class</DialogTitle>
          <DialogDescription>
            Set up your new class with all the tools you'll need.
          </DialogDescription>
        </DialogHeader>

        <CreateClassDialogContent
          onClassCreate={handleFormDataChange} // Prop name matches child's expectation
          onCancel={handleCancel}
          isEditing={false} // Explicitly false for Create dialog
          // initialData is not passed for new class creation
        />

        <DialogFooter className="flex justify-between sm:justify-between mt-4 pt-2 border-t">
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || !user || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
