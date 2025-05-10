
import { useEffect, useState } from "react";
import { ArrowRight, BookPlus, PlusCircle, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { CreateClassDialog, ClassData } from "@/components/class/CreateClassDialog";
import { useToast } from "@/hooks/use-toast";
import { EditClassDialog } from "@/components/class/EditClassDialog";
import { classOpenAIConfigService } from "@/services/classOpenAIConfig";

interface ClassOption {
  title: string;
  description: string;
  emoji: string;
  link: string;
  color: string;
  enabledWidgets: string[];
  openAIConfig?: {
    apiKey?: string;
    vectorStoreId?: string;
    assistantId?: string;
  };
}

const HomePage = () => {
  const [userName, setUserName] = useState<string>("Student");
  const [recentlyViewed, setRecentlyViewed] = useState<{title: string, path: string}[]>([]);
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [selectedClassToEdit, setSelectedClassToEdit] = useState<ClassOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Default widgets for a class
  const DEFAULT_CLASS_WIDGETS = ["supertutor", "database"];
  
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
            
          if (profile?.full_name) {
            // Get the first name from the full name
            const firstName = profile.full_name.split(' ')[0];
            setUserName(firstName);
          } else {
            // Fallback to email if no name is available
            const emailName = user.email?.split('@')[0] || "Student";
            setUserName(emailName);
          }
          
          // Fetch user's classes from the class_openai_configs table
          const { data: classConfigs, error: classConfigsError } = await supabase
            .from('class_openai_configs')
            .select('*')
            .eq('user_id', user.id);
            
          if (classConfigsError) {
            console.error("Error fetching class configs:", classConfigsError);
          } else if (classConfigs && classConfigs.length > 0) {
            // Transform the class configs into ClassOption objects
            const userClasses = classConfigs.map(config => {
              // Generate random emoji and color if not already set
              const emojis = ["📚", "🎓", "✏️", "📝", "🔬", "🎨", "🧮", "🔍", "📊", "💡"];
              const colors = ["blue-500", "green-500", "red-500", "yellow-500", "purple-500", "pink-500"];
              
              const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
              const randomColor = colors[Math.floor(Math.random() * colors.length)];
              
              return {
                title: config.class_title,
                description: `Class configuration for ${config.class_title}`,
                emoji: randomEmoji,
                link: "/super-stu",
                color: randomColor,
                enabledWidgets: DEFAULT_CLASS_WIDGETS,
                openAIConfig: {
                  apiKey: config.api_key,
                  vectorStoreId: config.vector_store_id,
                  assistantId: config.assistant_id
                }
              };
            });
            
            setClassOptions(userClasses);
          } else {
            // No classes found, leave the classOptions empty
            setClassOptions([]);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to load your profile data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
    
    // Clear active class when on homepage
    sessionStorage.removeItem('activeClass');
  }, [toast]);

  const handleCreateClass = async (classData: ClassData) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be signed in to create a class",
          variant: "destructive"
        });
        return;
      }
      
      // Get an appropriate emoji for the class
      const emojis = ["📚", "🎓", "✏️", "📝", "🔬", "🎨", "🧮", "🔍", "📊", "💡"];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      
      const newClass: ClassOption = {
        title: classData.title,
        description: classData.description,
        emoji: randomEmoji,
        link: "/super-stu", // Always navigate to Super Tutor
        color: classData.color,
        enabledWidgets: classData.enabledWidgets || DEFAULT_CLASS_WIDGETS,
        openAIConfig: classData.openAIConfig
      };
      
      setClassOptions(prev => [newClass, ...prev]);
      
      // Store OpenAI configuration in Supabase
      if (classData.openAIConfig) {
        try {
          await classOpenAIConfigService.saveConfigForClass(classData.title, classData.openAIConfig);
          console.log('OpenAI configuration saved for class:', classData.title);
        } catch (error) {
          console.error('Error storing OpenAI configuration:', error);
          toast({
            title: "Warning",
            description: "Failed to save OpenAI configuration. You may need to sign in.",
            variant: "destructive"
          });
        }
      }
      
      toast({
        title: "Class created!",
        description: `${classData.title} has been added to your dashboard.`
      });
    } catch (error) {
      console.error("Error creating class:", error);
      toast({
        title: "Error",
        description: "Failed to create class",
        variant: "destructive"
      });
    }
  };

  const handleUpdateClass = async (classData: ClassData) => {
    if (!selectedClassToEdit) return;
    
    try {
      // Update the class in the array
      setClassOptions(prev => 
        prev.map(classItem => 
          classItem.title === selectedClassToEdit.title 
            ? {
                ...classItem,
                title: classData.title,
                description: classData.description,
                color: classData.color,
                enabledWidgets: classData.enabledWidgets || DEFAULT_CLASS_WIDGETS,
                openAIConfig: classData.openAIConfig
              }
            : classItem
        )
      );
      
      // Update OpenAI configuration in Supabase
      if (classData.openAIConfig) {
        try {
          await classOpenAIConfigService.saveConfigForClass(classData.title, classData.openAIConfig);
          console.log('OpenAI configuration updated for class:', classData.title);
        } catch (error) {
          console.error('Error updating OpenAI configuration:', error);
          toast({
            title: "Warning",
            description: "Failed to update OpenAI configuration. You may need to sign in.",
            variant: "destructive"
          });
        }
      }
      
      toast({
        title: "Class updated",
        description: `${classData.title} has been updated.`
      });
      
      // Reset state
      setSelectedClassToEdit(null);
    } catch (error) {
      console.error("Error updating class:", error);
      toast({
        title: "Error",
        description: "Failed to update class",
        variant: "destructive"
      });
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClassToEdit) return;
    
    try {
      // Remove the class from the array
      setClassOptions(prev => 
        prev.filter(classItem => classItem.title !== selectedClassToEdit.title)
      );
      
      // Delete OpenAI configuration from Supabase
      try {
        const { error } = await supabase
          .from('class_openai_configs')
          .delete()
          .eq('class_title', selectedClassToEdit.title);
          
        if (error) {
          throw error;
        }
        
        console.log('Class deleted:', selectedClassToEdit.title);
        
        // Also remove from localStorage (backup storage)
        try {
          const existingConfigs = JSON.parse(localStorage.getItem('classOpenAIConfigs') || '[]');
          const filteredConfigs = existingConfigs.filter(
            (config: any) => config.title !== selectedClassToEdit.title
          );
          localStorage.setItem('classOpenAIConfigs', JSON.stringify(filteredConfigs));
        } catch (error) {
          console.error('Error removing OpenAI configuration from localStorage:', error);
        }
      } catch (error) {
        console.error('Error removing OpenAI configuration:', error);
      }
      
      toast({
        title: "Class deleted",
        description: `${selectedClassToEdit.title} has been deleted.`
      });
      
      // Reset state
      setSelectedClassToEdit(null);
    } catch (error) {
      console.error("Error deleting class:", error);
      toast({
        title: "Error",
        description: "Failed to delete class",
        variant: "destructive"
      });
    }
  };

  const handleEditClass = (classOption: ClassOption) => {
    setSelectedClassToEdit(classOption);
    setIsEditClassOpen(true);
  };

  const handleClassClick = (classOption: ClassOption) => {
    // Set the selected class as active
    sessionStorage.setItem('activeClass', JSON.stringify(classOption));
    
    // Navigate to Super Tutor
    navigate("/super-stu");
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Section with personalized greeting */}
      <div className="flex justify-between items-center">
        <PageHeader 
          title={`Hello, ${userName}!`}
          description="Which class would you like to study today?"
        />
        <Button 
          onClick={() => setIsCreateClassOpen(true)}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Add Class
        </Button>
      </div>

      {/* Class Options */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-64 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 w-full bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      ) : classOptions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classOptions.map((option, index) => (
            <div
              key={index} 
              className="cursor-pointer relative"
            >
              <Button 
                variant="ghost" 
                size="icon"
                className="absolute top-2 right-2 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClass(option);
                }}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Card 
                className={`h-full transition-all hover:shadow-md hover:border-${option.color}`}
                onClick={() => handleClassClick(option)}
              >
                <CardHeader>
                  <div className={`mb-4 p-2 bg-${option.color}/10 rounded-lg w-fit`}>
                    <span className="text-4xl">{option.emoji}</span>
                  </div>
                  <CardTitle>{option.title}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="ghost" className={`group text-${option.color}`}>
                    Enter class
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center border border-dashed rounded-lg p-6">
          <div className="text-4xl mb-4">👋</div>
          <h3 className="text-lg font-medium mb-2">Welcome to your personal dashboard</h3>
          <p className="text-muted-foreground mb-6">
            You don't have any classes yet. Click the "Add Class" button to create your first class.
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

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/upload">
            <Card className="hover:bg-gray-50 text-center p-6">
              <div className="flex flex-col items-center space-y-2">
                <div className="p-2 bg-blue-50 rounded-full">
                  <span className="text-2xl">📤</span>
                </div>
                <span className="font-medium">Upload Materials</span>
              </div>
            </Card>
          </Link>
          <Link to="/account">
            <Card className="hover:bg-gray-50 text-center p-6">
              <div className="flex flex-col items-center space-y-2">
                <div className="p-2 bg-blue-50 rounded-full">
                  <span className="text-2xl">📊</span>
                </div>
                <span className="font-medium">My Progress</span>
              </div>
            </Card>
          </Link>
          <Link to="/flashcards">
            <Card className="hover:bg-gray-50 text-center p-6">
              <div className="flex flex-col items-center space-y-2">
                <div className="p-2 bg-blue-50 rounded-full">
                  <span className="text-2xl">🔖</span>
                </div>
                <span className="font-medium">Create Flashcards</span>
              </div>
            </Card>
          </Link>
          <Link to="/quizzes">
            <Card className="hover:bg-gray-50 text-center p-6">
              <div className="flex flex-col items-center space-y-2">
                <div className="p-2 bg-blue-50 rounded-full">
                  <span className="text-2xl">📝</span>
                </div>
                <span className="font-medium">Take a Quiz</span>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Help CTA */}
      <div className="bg-cybercoach-blue-dark text-white p-6 rounded-xl text-center">
        <h2 className="text-2xl font-bold mb-2">Need help with your studies?</h2>
        <p className="mb-6 text-blue-100">
          Super Tutor's AI assistant can explain complex topics, help with assignments, and quiz you on key concepts.
        </p>
        <Link to="/super-stu">
          <Button size="lg" className="bg-cybercoach-blue-light hover:bg-cybercoach-blue text-white">
            Talk to Super Tutor Now
          </Button>
        </Link>
      </div>

      {/* Create Class Dialog */}
      <CreateClassDialog 
        open={isCreateClassOpen}
        onOpenChange={setIsCreateClassOpen}
        onClassCreate={handleCreateClass}
      />

      {/* Edit Class Dialog */}
      {selectedClassToEdit && (
        <EditClassDialog
          open={isEditClassOpen}
          onOpenChange={setIsEditClassOpen}
          initialData={{
            title: selectedClassToEdit.title,
            description: selectedClassToEdit.description,
            color: selectedClassToEdit.color,
            enabledWidgets: selectedClassToEdit.enabledWidgets,
            openAIConfig: selectedClassToEdit.openAIConfig
          }}
          onClassUpdate={handleUpdateClass}
          onClassDelete={handleDeleteClass}
        />
      )}
    </div>
  );
};

export default HomePage;
