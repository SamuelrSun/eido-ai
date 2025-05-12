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
  const [isLoading, setIsLoading] = useState(true);
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
        setUserName(profile?.full_name?.split(' ')[0] || currentUser.email?.split('@')[0] || "Student");

        const userClasses: ClassConfig[] = await classOpenAIConfigService.getAllClasses();
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
        setUserName("Student");
        setClassOptions([]);
      }
    } catch (error) {
      console.error("Error fetching user data and classes:", error);
      toast({ title: "Error Loading Data", description: "Failed to load data.", variant: "destructive" });
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
    return () => authListener.subscription.unsubscribe();
  }, [fetchUserDataAndClasses, navigate]);

  const handleCreateClass = async (classDialogData: CreateClassDialogClassData) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be signed in.", variant: "destructive" });
      return;
    }
    try {
      const classDataInput = {
        title: classDialogData.title,
        openAIConfigManual: classDialogData.openAIConfig || {},
        emoji: classDialogData.emoji || getEmojiForClass(classDialogData.title),
        professor: classDialogData.professor,
        classTime: classDialogData.classTime,
        classroom: classDialogData.classroom,
        enabledWidgets: classDialogData.enabledWidgets as WidgetType[]
      };
      // Call saveConfigForClass without class_id_to_update for new class creation
      const newDbClassRecord = await classOpenAIConfigService.saveConfigForClass(classDataInput);

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
      setClassOptions(prev => [newClassOption, ...prev.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())]);
      setIsCreateClassOpen(false);
      toast({ title: "Class Created!", description: `${newClassOption.title} added. AI features setting up.` });
      setTimeout(() => fetchUserDataAndClasses(user), 5000); // Increased delay for provisioning
    } catch (error) {
      console.error("Error in handleCreateClass:", error);
      toast({ title: "Error Creating Class", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  const handleUpdateClass = async (classDialogData: CreateClassDialogClassData) => {
    if (!selectedClassToEdit || !user) return;
    try {
      const classDataInput = {
        title: classDialogData.title,
        openAIConfigManual: classDialogData.openAIConfig || {},
        emoji: classDialogData.emoji,
        professor: classDialogData.professor,
        classTime: classDialogData.classTime,
        classroom: classDialogData.classroom,
        enabledWidgets: classDialogData.enabledWidgets as WidgetType[]
      };
      // Pass the class_id of the class being edited for an update operation
      const updatedDbClassRecord = await classOpenAIConfigService.saveConfigForClass(
        classDataInput,
        selectedClassToEdit.class_id // Pass class_id for update
      );

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
      setClassOptions(prev =>
        prev.map(opt => (opt.class_id === selectedClassToEdit.class_id ? updatedClassOption : opt))
      );
      setIsEditClassOpen(false);
      setSelectedClassToEdit(null);
      toast({ title: "Class Updated", description: `${updatedClassOption.title} has been updated.` });
      // Optionally re-fetch to ensure full consistency, though optimistic update is usually fine.
      // fetchUserDataAndClasses(user); 
    } catch (error) {
      console.error("Error in handleUpdateClass:", error);
      toast({ title: "Error Updating Class", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
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
      setIsEditClassOpen(false);
      setSelectedClassToEdit(null);
      toast({ title: "Class Deleted", description: `${selectedClassToEdit.title} has been removed.` });
    } catch (error) {
      console.error("Error in handleDeleteClass:", error);
      toast({ title: "Error Deleting Class", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
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
                onClick={(e) => { e.stopPropagation(); handleEditClassClick(option); }}
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
                    {option.professor && (<p><span className="font-medium text-foreground">Professor:</span> {option.professor}</p>)}
                    {option.classTime && (<p><span className="font-medium text-foreground">Time:</span> {option.classTime}</p>)}
                    {option.classroom && (<p><span className="font-medium text-foreground">Location:</span> {option.classroom}</p>)}
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
          <Button onClick={() => setIsCreateClassOpen(true)} className="flex items-center gap-2" >
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
        onOpenChange={setIsCreateClassOpen}
        onClassCreate={handleCreateClass}
      />

      {selectedClassToEdit && (
        <EditClassDialog
          open={isEditClassOpen}
          onOpenChange={setIsEditClassOpen}
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
