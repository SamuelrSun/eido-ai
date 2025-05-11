
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
  const [isFormValid, setIsFormValid] = useState(false);
  const [formData, setFormData] = useState<ClassData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Check for authenticated user
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Auth session check in CreateClassDialog:", session);
        setUser(session?.user || null);
      } catch (error) {
        console.error("Error checking auth in CreateClassDialog:", error);
      }
    };
    
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change in CreateClassDialog:", event, session?.user?.id);
      setUser(session?.user || null);
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  const handleSubmit = async () => {
    if (!formData || !formData.title.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a title for your class.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Double-check authentication
      if (!user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          throw new Error("User must be authenticated to create a class");
        }
        setUser(session.user);
      }
      
      console.log("Creating class with user:", user?.id);
      console.log("Class data:", formData);
      
      // Save to database
      await classOpenAIConfigService.saveConfigForClass(
        formData.title, 
        formData.openAIConfig || {},
        formData.emoji,
        formData.professor,
        formData.classTime,
        formData.classroom,
        formData.enabledWidgets || ["flashcards", "quizzes"]
      );
      
      // Then call the parent callback
      onClassCreate(formData);
      onOpenChange(false);
      setFormData(null);
      setIsFormValid(false);
      toast({
        title: "Class created successfully",
        description: `${formData.title} has been added to your dashboard.`,
      });
    } catch (error: any) {
      console.error("Error saving class:", error);
      toast({
        title: "Error creating class",
        description: error.message || "There was a problem saving your class data. Please make sure you're signed in and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
