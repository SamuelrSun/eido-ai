// src/pages/HomePage.tsx
import { useEffect, useState, useCallback } from "react";
import { ArrowRight, PlusCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { CreateClassDialog, ClassData as CreateClassDialogClassData } from "@/components/class/CreateClassDialog";
import { useToast } from "@/hooks/use-toast";
import { EditClassDialog } from "@/components/class/EditClassDialog";
import { classOpenAIConfigService, ClassConfig, OpenAIConfig } from "@/services/classOpenAIConfig";
import { getEmojiForClass } from "@/utils/emojiUtils";
import type { User } from "@supabase/supabase-js";
import type { WidgetType } from "@/hooks/use-widgets";

interface ClassOption {
  class_id: string;
  title: string;
  professor?: string | null;
  classTime?: string | null;
  classroom?: string | null;
  emoji: string;
  link: string;
  enabledWidgets: WidgetType[];
  openAIConfig?: OpenAIConfig;
  created_at?: string | null;
  updated_at?: string | null;
  user_id?: string | null;
}

const DEFAULT_CLASS_WIDGETS: WidgetType[] = ["supertutor", "database"];

const HomePage = () => {
  const [userName, setUserName] = useState<string>("Student");
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [selectedClassToEdit, setSelectedClassToEdit] = useState<ClassOption | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For overall page/class list loading
  const { toast } = useToast();
  const navigate = useNavigate();

  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [user, setUser] = useState<User | null>(null);

  const fetchUserDataAndClasses = useCallback(async (currentUser: User | null) => {
    setIsLoading(true);
    try {
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (profile?.full_name) {
          const firstName = profile.full_name.split(' ')[0];
          setUserName(firstName);
        } else {
          const emailName = currentUser.email?.split('@')[0] || "Student";
          setUserName(emailName);
        }

        const userClasses: ClassConfig[] = await classOpenAIConfigService.getAllClasses();
        if (userClasses && userClasses.length > 0) {
          const transformedOptions: ClassOption[] = userClasses.map((config): ClassOption => ({
            class_id: config.class_id,
            title: config.title,
            professor: config.professor,
            classTime: config.classTime,
            classroom: config.classroom,
            emoji: config.emoji || getEmojiForClass(config.title),
            link: "/super-stu",
            enabledWidgets: (config.enabledWidgets || DEFAULT_CLASS_WIDGETS) as WidgetType[],
            openAIConfig: config.openAIConfig,
            created_at: config.created_at,
            updated_at: config.updated_at,
            user_id: config.user_id,
          }));
          setClassOptions(transformedOptions);
        } else {
          setClassOptions([]);
        }
      } else {
        setUserName("Student");
        setClassOptions([]);
      }
    } catch (error) {
      console.error("Error fetching user data and classes:", error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load your profile or class data. Please try refreshing.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      fetchUserDataAndClasses(currentUser);
      if (_event === 'SIGNED_OUT') {
        sessionStorage.removeItem('activeClass');
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      fetchUserDataAndClasses(currentUser);
    });
    
    sessionStorage.removeItem('activeClass');

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserDataAndClasses, navigate]);

  const handleCreateClass = async (classDialogData: CreateClassDialogClassData) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be signed in.", variant: "destructive" });
      return;
    }
    try {
      const newDbClassRecord = await classOpenAIConfigService.saveConfigForClass(
        classDialogData.title,
        classDialogData.openAIConfig || {},
        classDialogData.emoji || getEmojiForClass(classDialogData.title),
        classDialogData.professor,
        classDialogData.classTime,
        classDialogData.classroom,
        classDialogData.enabledWidgets as WidgetType[]
      );

      const newClassOption: ClassOption = {
        class_id: newDbClassRecord.class_id,
        title: newDbClassRecord.class_title,
        professor: newDbClassRecord.professor,
        classTime: newDbClassRecord.class_time,
        classroom: newDbClassRecord.classroom,
        emoji: newDbClassRecord.emoji || getEmojiForClass(newDbClassRecord.class_title),
        link: "/super-stu",
        enabledWidgets: (newDbClassRecord.enabled_widgets || DEFAULT_CLASS_WIDGETS) as WidgetType[],
        openAIConfig: {
          assistantId: newDbClassRecord.assistant_id,
          vectorStoreId: newDbClassRecord.vector_store_id,
        },
        created_at: newDbClassRecord.created_at,
        updated_at: newDbClassRecord.updated_at,
        user_id: newDbClassRecord.user_id,
      };

      setClassOptions(prev => [newClassOption, ...prev]);
      toast({
        title: "Class Created!",
        description: `${newClassOption.title} has been added. AI features are being set up.`,
      });
      setTimeout(() => fetchUserDataAndClasses(user), 5000); // Increased delay for provisioning
    } catch (error) {
      console.error("Error in handleCreateClass:", error);
      toast({ title: "Error Creating Class", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setIsCreateClassOpen(false); // Ensure dialog closes
    }
  };

  const handleUpdateClass = async (classDialogData: CreateClassDialogClassData) => {
    if (!selectedClassToEdit || !user) return;

    try {
      const updatedDbClassRecord = await classOpenAIConfigService.saveConfigForClass(
        classDialogData.title,
        classDialogData.openAIConfig || {},
        classDialogData.emoji,
        classDialogData.professor,
        classDialogData.classTime,
        classDialogData.classroom,
        classDialogData.enabledWidgets as WidgetType[]
      );
      
      // If title changed, and saveConfigForClass doesn't handle deleting the old record based on ID,
      // and if the ID of the record returned is different from the one we intended to edit,
      // then the old one might need explicit deletion.
      // The current saveConfigForClass uses title to find existing, then updates by class_id.
      // So, if the title changes, it might be treated as a new class if not handled carefully.
      // For now, we assume saveConfigForClass correctly updates the record with selectedClassToEdit.class_id
      // if classDialogData.title matches selectedClassToEdit.title, or creates new if title is different.
      // A more robust approach in saveConfigForClass would be to pass class_id for updates.
      if (selectedClassToEdit.title !== classDialogData.title && selectedClassToEdit.class_id !== updatedDbClassRecord.class_id) {
         // This condition implies the title changed AND the service treated it as a new insert
         // because it couldn't find the original by the *new* title.
         // We should delete the original class record.
         await classOpenAIConfigService.deleteClass(selectedClassToEdit.class_id);
      }

       const updatedClassOption: ClassOption = {
        class_id: updatedDbClassRecord.class_id,
        title: updatedDbClassRecord.class_title,
        professor: updatedDbClassRecord.professor,
        classTime: updatedDbClassRecord.class_time,
        classroom: updatedDbClassRecord.classroom,
        emoji: updatedDbClassRecord.emoji || getEmojiForClass(updatedDbClassRecord.class_title),
        link: "/super-stu",
        enabledWidgets: (updatedDbClassRecord.enabled_widgets || DEFAULT_CLASS_WIDGETS) as WidgetType[],
        openAIConfig: {
          assistantId: updatedDbClassRecord.assistant_id,
          vectorStoreId: updatedDbClassRecord.vector_store_id,
        },
        created_at: updatedDbClassRecord.created_at,
        updated_at: updatedDbClassRecord.updated_at,
        user_id: updatedDbClassRecord.user_id,
      };

      // Update the specific class in the list, or add if it's a "new" one due to title change
      setClassOptions(prev => {
          const existingIndex = prev.findIndex(opt => opt.class_id === selectedClassToEdit.class_id);
          if (existingIndex > -1) {
              // If original class_id is found, update it
              return prev.map(opt => (opt.class_id === selectedClassToEdit.class_id ? updatedClassOption : opt));
          } else {
              // If original class_id not found (e.g., title change created new), add new and filter old
              return [updatedClassOption, ...prev.filter(opt => opt.class_id !== selectedClassToEdit.class_id)];
          }
      });


      setSelectedClassToEdit(null);
      toast({ title: "Class Updated", description: `${updatedClassOption.title} has been updated.` });
      // Re-fetch to ensure full consistency, especially if title change logic is complex
      fetchUserDataAndClasses(user);

    } catch (error) {
      console.error("Error in handleUpdateClass:", error);
      toast({ title: "Error Updating Class", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setIsEditClassOpen(false); // Ensure dialog closes
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClassToEdit || !user) return;
    try {
      await classOpenAIConfigService.deleteClass(selectedClassToEdit.class_id);

      setClassOptions(prev => prev.filter(opt => opt.class_id !== selectedClassToEdit.class_id));
      
      const activeClassJSON = sessionStorage.getItem('activeClass');
      if (activeClassJSON) {
          const parsedActiveClass = JSON.parse(activeClassJSON);
          if (parsedActiveClass.class_id === selectedClassToEdit.class_id) {
              sessionStorage.removeItem('activeClass');
          }
      }
      toast({ title: "Class Deleted", description: `${selectedClassToEdit.title} has been removed.` });
    } catch (error) {
      console.error("Error in handleDeleteClass:", error);
      toast({ title: "Error Deleting Class", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    } finally {
      setIsEditClassOpen(false); // Ensure dialog closes
      setSelectedClassToEdit(null);
    }
  };

  const handleEditClassClick = (classOption: ClassOption) => {
    setSelectedClassToEdit(classOption);
    setIsEditClassOpen(true);
  };

  const handleClassClick = (classOption: ClassOption) => {
    sessionStorage.setItem('activeClass', JSON.stringify(classOption));
    navigate(classOption.link);
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex justify-between items-center">
        <PageHeader
          title={`Hello, ${userName}!`}
          description="Which class would you like to study today?"
        />
        <Button
          onClick={() => setIsCreateClassOpen(true)}
          className="flex items-center gap-2"
          disabled={!user}
        >
          <PlusCircle className="h-4 w-4" />
          Add Class
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-pulse space-y-4 w-full">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      ) : !user ? (
         <div className="py-12 text-center border border-dashed rounded-lg p-6">
          <div className="text-4xl mb-4">🔑</div>
          <h3 className="text-lg font-medium mb-2">Please Sign In</h3>
          <p className="text-muted-foreground mb-6">
            Sign in to create and access your classes.
          </p>
          <Button onClick={() => navigate("/auth")}>Go to Sign In</Button>
        </div>
      ) : classOptions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classOptions.map((option) => (
            <div
              key={option.class_id}
              className="cursor-pointer relative group"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClassClick(option);
                }}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Card
                className="h-full transition-all hover:shadow-lg hover:border-primary flex flex-col"
                onClick={() => handleClassClick(option)}
              >
                <CardHeader className="flex-shrink-0">
                  <div className="mb-4 p-3 bg-primary/10 rounded-lg w-fit">
                    <span className="text-4xl">{option.emoji}</span>
                  </div>
                  <CardTitle className="truncate" title={option.title}>{option.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 flex-grow">
                  <div className="text-sm space-y-1 text-muted-foreground">
                    {option.professor && (
                      <p><span className="font-medium text-foreground">Professor:</span> {option.professor}</p>
                    )}
                    {option.classTime && (
                      <p><span className="font-medium text-foreground">Time:</span> {option.classTime}</p>
                    )}
                    {option.classroom && (
                      <p><span className="font-medium text-foreground">Location:</span> {option.classroom}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex-shrink-0">
                  <div className="text-primary font-medium flex items-center group-hover:underline">
                    Enter class
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center border border-dashed rounded-lg p-6">
          <div className="text-4xl mb-4">👋</div>
          <h3 className="text-lg font-medium mb-2">Welcome to your dashboard!</h3>
          <p className="text-muted-foreground mb-6">
            You don't have any classes yet. Click "Add Class" to create your first one.
          </p>
          <Button
            onClick={() => setIsCreateClassOpen(true)}
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Add Your First Class
          </Button>
        </div>
      )}

      {user && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Link to="/account" className="block">
              <Card className="hover:bg-accent text-center p-6 h-full flex flex-col justify-center items-center">
                <div className="p-3 bg-primary/10 rounded-full mb-2 w-fit">
                  <span className="text-2xl">👤</span>
                </div>
                <span className="font-medium">My Account</span>
              </Card>
            </Link>
          </div>
        </div>
      )}

      <CreateClassDialog
        open={isCreateClassOpen}
        onOpenChange={setIsCreateClassOpen} // HomePage now controls dialog visibility
        onClassCreate={handleCreateClass}
      />

      {selectedClassToEdit && (
        <EditClassDialog
          open={isEditClassOpen}
          onOpenChange={setIsEditClassOpen} // HomePage now controls dialog visibility
          initialData={{
            title: selectedClassToEdit.title,
            professor: selectedClassToEdit.professor,
            classTime: selectedClassToEdit.classTime,
            classroom: selectedClassToEdit.classroom,
            emoji: selectedClassToEdit.emoji,
            enabledWidgets: selectedClassToEdit.enabledWidgets,
            openAIConfig: selectedClassToEdit.openAIConfig ? {
                assistantId: selectedClassToEdit.openAIConfig.assistantId,
                vectorStoreId: selectedClassToEdit.openAIConfig.vectorStoreId,
            } : undefined,
          }}
          onClassUpdate={handleUpdateClass}
          onClassDelete={handleDeleteClass}
        />
      )}
    </div>
  );
};

export default HomePage;