
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ClassData } from "./CreateClassDialog";
import { useToast } from "@/hooks/use-toast";
import { classOpenAIConfigService } from "@/services/classOpenAIConfig";
import { supabase } from "@/integrations/supabase/client";

interface EditClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClassUpdate: (classData: ClassData) => void;
  onClassDelete: () => void;
  initialData: ClassData;
}

export function EditClassDialog({ 
  open, 
  onOpenChange, 
  onClassUpdate, 
  onClassDelete,
  initialData 
}: EditClassDialogProps) {
  // State to track form validity (for the update button)
  const [isFormValid, setIsFormValid] = useState(false);
  // Reference to form data for submission
  const [formData, setFormData] = useState<ClassData | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check for authenticated user
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (initialData && open) {
      setFormData(initialData);
      setIsFormValid(!!initialData.title.trim());
    }
  }, [initialData, open]);

  const handleSubmit = async () => {
    if (formData && formData.title.trim()) {
      try {
        // If user is authenticated, save to database first
        if (user) {
          await classOpenAIConfigService.saveConfigForClass(
            formData.title, 
            formData.openAIConfig || {},
            formData.color,
            formData.emoji,
            formData.professor,
            formData.classTime,
            formData.classroom,
            formData.enabledWidgets
          );
        }
        
        // Then call the parent callback
        onClassUpdate(formData);
        onOpenChange(false);
        toast({
          title: "Class updated",
          description: `${formData.title} has been updated successfully.`
        });
      } catch (error) {
        console.error("Error updating class:", error);
        toast({
          title: "Error updating class",
          description: "There was a problem saving your class data.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleFormDataChange = (data: ClassData) => {
    setFormData(data);
    setIsFormValid(!!data.title.trim());
  };

  const handleDelete = async () => {
    try {
      // If user is authenticated, delete from database first
      if (user && initialData.title) {
        await classOpenAIConfigService.deleteClass(initialData.title);
      }
      
      // Then call the parent callback
      onClassDelete();
      setShowDeleteAlert(false);
      onOpenChange(false);
      toast({
        title: "Class deleted",
        description: `${initialData.title} has been removed from your dashboard.`
      });
    } catch (error) {
      console.error("Error deleting class:", error);
      toast({
        title: "Error deleting class",
        description: "There was a problem removing your class data.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Update your class settings and enabled tools
            </DialogDescription>
          </DialogHeader>
          
          <CreateClassDialogContent 
            onClassCreate={handleFormDataChange}
            onCancel={handleCancel}
            initialData={initialData}
            isEditing={true}
          />
          
          <DialogFooter className="flex justify-between sm:justify-between mt-4 pt-2 border-t">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteAlert(true)}
              >
                Delete Class
              </Button>
            </div>
            <Button onClick={handleSubmit} disabled={!isFormValid || (user === null)}>
              Update Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the class
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
