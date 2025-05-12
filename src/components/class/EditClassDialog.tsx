// src/components/class/EditClassDialog.tsx
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
// ClassData is imported from CreateClassDialog to ensure consistency
import { ClassData } from "./CreateClassDialog";
import { useToast } from "@/hooks/use-toast";
// classOpenAIConfigService is no longer directly called for save/delete from here
// import { classOpenAIConfigService } from "@/services/classOpenAIConfig";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { WidgetType } from "@/hooks/use-widgets"; // Import WidgetType

interface EditClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClassUpdate: (classData: ClassData) => void; // Points to HomePage's handleUpdateClass
  onClassDelete: () => void; // Points to HomePage's handleDeleteClass
  initialData: ClassData; // This should now align with the updated ClassData structure
}

const DEFAULT_CLASS_WIDGETS: WidgetType[] = ["supertutor", "database"];


export function EditClassDialog({
  open,
  onOpenChange,
  onClassUpdate,
  onClassDelete,
  initialData
}: EditClassDialogProps) {
  const [isFormValid, setIsFormValid] = useState(false);
  // formData will be derived from initialData and updates from CreateClassDialogContent
  const [formData, setFormData] = useState<ClassData>(initialData);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check for authenticated user
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Update formData when initialData changes (e.g., when dialog is reopened for a different class)
  useEffect(() => {
    if (initialData && open) {
      // Ensure enabledWidgets is an array and openAIConfig is structured correctly
      const sanitizedInitialData: ClassData = {
        ...initialData,
        enabledWidgets: Array.isArray(initialData.enabledWidgets) && initialData.enabledWidgets.length > 0
            ? initialData.enabledWidgets
            : DEFAULT_CLASS_WIDGETS,
        openAIConfig: initialData.openAIConfig ? {
            vectorStoreId: initialData.openAIConfig.vectorStoreId || null,
            assistantId: initialData.openAIConfig.assistantId || null,
            // No apiKey
        } : { vectorStoreId: null, assistantId: null }
      };
      setFormData(sanitizedInitialData);
      setIsFormValid(!!initialData.title?.trim());
    }
  }, [initialData, open]);

  const handleSubmit = async () => {
    if (!formData || !formData.title?.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a title for your class.",
        variant: "destructive"
      });
      return;
    }
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to update your class.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // The actual saving/updating is handled by onClassUpdate (HomePage's handleUpdateClass)
      await onClassUpdate(formData);
      // HomePage's handleUpdateClass will show its own success toast and potentially close the dialog.
    } catch (error) {
      console.error("Error during class update process (dialog level):", error);
      toast({
        title: "Error Updating Class",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      // Parent (HomePage) is responsible for closing the dialog via onOpenChange.
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (!isDeleting && !isSaving) {
      onOpenChange(false);
    }
  };

  // This function is called by CreateClassDialogContent whenever its internal form data changes
  const handleFormDataChange = (data: ClassData) => {
    setFormData(data);
    setIsFormValid(!!data.title?.trim());
  };

  const handleDelete = async () => {
    if (!initialData?.title) { // Should ideally use class_id if available from initialData
      toast({
        title: "Error deleting class",
        description: "No class identifier provided for deletion.",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to delete your class.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      // The actual deletion is handled by onClassDelete (HomePage's handleDeleteClass)
      await onClassDelete();
      // HomePage's handleDeleteClass will show its own success toast and close the dialog.
      setShowDeleteAlert(false); // Close the confirmation alert
    } catch (error) {
      console.error("Error during class deletion process (dialog level):", error);
      toast({
        title: "Error Deleting Class",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      // Parent (HomePage) is responsible for closing the main dialog via onOpenChange.
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(newOpenState) => {
          if (!isDeleting && !isSaving) {
            onOpenChange(newOpenState);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Update your class settings and enabled tools.
              {initialData?.title ? ` Editing: ${initialData.title}` : ''}
            </DialogDescription>
          </DialogHeader>

          {/* Pass the current formData (derived from initialData) to the content component */}
          {/* CreateClassDialogContent needs to be robust enough to handle pre-filled initialData */}
          <CreateClassDialogContent
            onClassCreate={handleFormDataChange} // This updates the formData state in EditClassDialog
            onCancel={handleCancel}
            initialData={formData} // Pass the current formData which is based on initialData
            isEditing={true}
          />

          <DialogFooter className="flex justify-between sm:justify-between mt-4 pt-2 border-t">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isDeleting || isSaving}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteAlert(true)}
                disabled={isDeleting || isSaving}
              >
                {isDeleting ? "Deleting..." : "Delete Class"}
              </Button>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || !user || isDeleting || isSaving}
            >
              {isSaving ? "Updating..." : "Update Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showDeleteAlert}
        onOpenChange={(newOpenState) => {
          if (!isDeleting) {
            setShowDeleteAlert(newOpenState);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the class
              "{initialData?.title || 'this class'}" and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteAlert(false)} disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
