
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
import { classOpenAIConfigService } from "@/services/classOpenAIConfig";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClassCreate: (classData: ClassData) => void;
}

export interface ClassData {
  title: string;
  professor?: string;
  classTime?: string;
  classroom?: string;
  emoji?: string;
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
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  
  // Check for authenticated user
  useEffect(() => {
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
  
  const handleSubmit = async () => {
    if (formData && formData.title.trim()) {
      try {
        // If user is authenticated, save to database first
        if (user) {
          await classOpenAIConfigService.saveConfigForClass(
            formData.title, 
            formData.openAIConfig || {},
            formData.emoji,
            formData.professor,
            formData.classTime,
            formData.classroom,
            formData.enabledWidgets
          );
        }
        
        // Then call the parent callback
        onClassCreate(formData);
        onOpenChange(false);
        setFormData(null);
        setIsFormValid(false);
      } catch (error) {
        console.error("Error saving class:", error);
        toast({
          title: "Error creating class",
          description: "There was a problem saving your class data.",
          variant: "destructive",
        });
      }
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
        <DialogHeader className="text-left">
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
          <Button onClick={handleSubmit} disabled={!isFormValid || (user === null)}>
            Create Class
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
