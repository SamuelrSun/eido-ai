
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
import { classOpenAIConfigService, ClassConfig } from "@/services/classOpenAIConfig";
import { getEmojiForClass } from "@/utils/emojiUtils";

interface ClassOption {
  title: string;
  professor?: string;
  classTime?: string;
  classroom?: string;
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

const DEFAULT_CLASS_WIDGETS = ["supertutor", "database"];

const HomePage = () => {
  const [userName, setUserName] = useState<string>("Student");
  const [recentlyViewed, setRecentlyViewed] = useState<{title: string, path: string}[]>([]);
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [isEditClassOpen, setIsEditClassOpen] = useState(false);
  const [selectedClassToEdit, setSelectedClassToEdit] = useState<ClassOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [forceLocalStorageOnly, setForceLocalStorageOnly] = useState(false);

  // Function to fetch all user data
  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching user profile and classes");
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
          
        if (profile?.full_name) {
          // Get the first name from the full name
          const firstName = profile.full_name.split(' ')[0];
          setUserName(firstName);
        } else {
          // Fallback to email if no name is available
          const emailName = user.email?.split('@')[0] || "Student";
          setUserName(emailName);
        }
        
        try {
          // Force clean fetch of classes with no caching
          console.log('Calling classOpenAIConfigService.getAllClasses()');
          const userClasses = forceLocalStorageOnly ? 
            JSON.parse(localStorage.getItem('classOpenAIConfigs') || '[]') :
            await classOpenAIConfigService.getAllClasses();
            
          console.log('Retrieved classes:', userClasses);
          
          if (userClasses && userClasses.length > 0) {
            console.log(`Found ${userClasses.length} classes for the user:`, userClasses);
            
            // Transform ClassConfig objects to ClassOption objects
            const classOptions = userClasses.map((config): ClassOption => {
              // Generate a random color if not already set
              const colors = ["blue-300", "emerald-300", "rose-300", "amber-200", "violet-300", "indigo-300"];
              const randomColor = colors[Math.floor(Math.random() * colors.length)];
              
              // Use stored emoji or generate one based on class title
              const classEmoji = config.emoji || getEmojiForClass(config.title);
              
              return {
                title: config.title,
                professor: config.professor || "",
                classTime: config.classTime || "",
                classroom: config.classroom || "",
                emoji: classEmoji,
                link: "/super-stu",
                color: config.color || randomColor, 
                enabledWidgets: DEFAULT_CLASS_WIDGETS,
                openAIConfig: config.openAIConfig
              };
            });
            
            console.log("Transformed class options:", classOptions);
            setClassOptions(classOptions);
          } else {
            console.log("No classes found for user");
            setClassOptions([]);
          }
        } catch (fetchError) {
          console.error("Error fetching class data:", fetchError);
          toast({
            title: "Warning",
            description: "Failed to load class data. Trying alternate method.",
            variant: "destructive"
          });
          
          // Try using localStorage only if Supabase fetch fails
          setForceLocalStorageOnly(true);
          setRefreshTrigger(prev => prev + 1);
        }
      } else {
        console.log("No authenticated user found");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Error",
        description: "Failed to load your profile data. Please try refreshing the page.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    
    // Clear active class when on homepage
    sessionStorage.removeItem('activeClass');
  }, [refreshTrigger]); // Added refreshTrigger to dependencies

  const handleCreateClass = async (classData: ClassData) => {
    try {
      console.log("Creating class with data:", classData);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be signed in to create a class. Please sign in and try again.",
          variant: "destructive"
        });
        return;
      }
      
      // Ensure we have an emoji (either from form or generated)
      const classEmoji = classData.emoji || getEmojiForClass(classData.title);
      console.log("Using emoji:", classEmoji);
      
      // Add the new class to the UI immediately for better user experience
      const newClass: ClassOption = {
        title: classData.title,
        professor: classData.professor,
        classTime: classData.classTime,
        classroom: classData.classroom,
        emoji: classEmoji,
        link: "/super-stu",
        color: classData.color,
        enabledWidgets: classData.enabledWidgets || DEFAULT_CLASS_WIDGETS,
        openAIConfig: classData.openAIConfig
      };
      
      setClassOptions(prev => [newClass, ...prev]);
      
      // Store OpenAI configuration and class info in Supabase
      if (classData.title) {
        try {
          console.log("Saving class data using classOpenAIConfigService");
          // Save class and OpenAI config data using our service
          await classOpenAIConfigService.saveConfigForClass(
            classData.title,
            classData.openAIConfig || {},
            classData.color,
            classEmoji,
            classData.professor,
            classData.classTime,
            classData.classroom
          );
          
          console.log('Class data saved successfully:', classData.title);
          
          // Force a refresh of data by incrementing the refreshTrigger
          setRefreshTrigger(prev => prev + 1);
          
        } catch (error) {
          console.error('Error storing class data:', error);
          toast({
            title: "Warning",
            description: "Failed to save class information to the server. A local version has been saved.",
            variant: "destructive"
          });
          
          // Still update localStorage manually as a fallback
          try {
            const storedConfig = {
              id: Date.now().toString(),
              title: classData.title,
              professor: classData.professor,
              classTime: classData.classTime,
              classroom: classData.classroom,
              color: classData.color,
              emoji: classEmoji,
              openAIConfig: classData.openAIConfig || {}
            };
            
            const existingConfigs = JSON.parse(localStorage.getItem('classOpenAIConfigs') || '[]');
            existingConfigs.push(storedConfig);
            localStorage.setItem('classOpenAIConfigs', JSON.stringify(existingConfigs));
            
            // Force refresh with localStorage only
            setForceLocalStorageOnly(true);
            setRefreshTrigger(prev => prev + 1);
          } catch (localStoreError) {
            console.error('Failed to save to localStorage:', localStoreError);
          }
        }
      }
      
      toast({
        title: "Class created!",
        description: `${classData.title} has been added to your dashboard.`
      });
      
      setIsCreateClassOpen(false);
    } catch (error) {
      console.error("Error creating class:", error);
      toast({
        title: "Error",
        description: "Failed to create class. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateClass = async (classData: ClassData) => {
    if (!selectedClassToEdit) return;
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be signed in to update a class",
          variant: "destructive"
        });
        return;
      }
      
      // Update the class in the UI immediately
      setClassOptions(prev => 
        prev.map(classItem => 
          classItem.title === selectedClassToEdit.title 
            ? {
                ...classItem,
                title: classData.title,
                professor: classData.professor,
                classTime: classData.classTime,
                classroom: classData.classroom,
                color: classData.color,
                emoji: classData.emoji,
                enabledWidgets: classData.enabledWidgets || DEFAULT_CLASS_WIDGETS,
                openAIConfig: classData.openAIConfig
              }
            : classItem
        )
      );
      
      // Update class data in Supabase using our service
      try {
        await classOpenAIConfigService.saveConfigForClass(
          classData.title,
          classData.openAIConfig || {},
          classData.color,
          classData.emoji,
          classData.professor,
          classData.classTime,
          classData.classroom
        );
        
        // If the title changed, delete the old class
        if (selectedClassToEdit.title !== classData.title) {
          await classOpenAIConfigService.deleteClass(selectedClassToEdit.title);
        }
        
        console.log('Class data updated for:', classData.title);
        
        // Force a refresh of data by incrementing the refreshTrigger
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error('Error updating class data:', error);
        toast({
          title: "Warning",
          description: "Failed to update class information on the server. Local changes were made.",
          variant: "destructive"
        });
        
        // Manual localStorage update as fallback
        try {
          const existingConfigs = JSON.parse(localStorage.getItem('classOpenAIConfigs') || '[]');
          const updatedConfigs = existingConfigs.map(config => 
            config.title === selectedClassToEdit.title
              ? {
                  ...config,
                  title: classData.title,
                  professor: classData.professor,
                  classTime: classData.classTime,
                  classroom: classData.classroom,
                  color: classData.color,
                  emoji: classData.emoji,
                  openAIConfig: classData.openAIConfig || {}
                }
              : config
          );
          
          localStorage.setItem('classOpenAIConfigs', JSON.stringify(updatedConfigs));
          
          // Force refresh with localStorage only
          setForceLocalStorageOnly(true);
          setRefreshTrigger(prev => prev + 1);
        } catch (localStoreError) {
          console.error('Failed to update localStorage:', localStoreError);
        }
      }
      
      toast({
        title: "Class updated",
        description: `${classData.title} has been updated.`
      });
      
      // Reset state
      setSelectedClassToEdit(null);
      setIsEditClassOpen(false);
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
      // Delete using our service
      await classOpenAIConfigService.deleteClass(selectedClassToEdit.title);
      
      // Check if the deleted class is the active class
      const activeClass = sessionStorage.getItem('activeClass');
      if (activeClass) {
        try {
          const parsedClass = JSON.parse(activeClass);
          // If the active class is being deleted, remove it from session storage
          if (parsedClass.title === selectedClassToEdit.title) {
            sessionStorage.removeItem('activeClass');
          }
        } catch (error) {
          console.error("Error parsing active class:", error);
        }
      }
      
      // Remove the class from the UI
      setClassOptions(prev => 
        prev.filter(classItem => classItem.title !== selectedClassToEdit.title)
      );
      
      toast({
        title: "Class deleted",
        description: `${selectedClassToEdit.title} has been deleted.`
      });
      
      // Force a refresh of data by incrementing the refreshTrigger
      setRefreshTrigger(prev => prev + 1);
      
      // Reset state
      setSelectedClassToEdit(null);
      setIsEditClassOpen(false);
    } catch (error) {
      console.error("Error deleting class:", error);
      
      // Try fallback to localStorage
      try {
        const existingConfigs = JSON.parse(localStorage.getItem('classOpenAIConfigs') || '[]');
        const updatedConfigs = existingConfigs.filter(config => config.title !== selectedClassToEdit?.title);
        localStorage.setItem('classOpenAIConfigs', JSON.stringify(updatedConfigs));
        
        // Force UI update
        setClassOptions(prev => 
          prev.filter(classItem => classItem.title !== selectedClassToEdit?.title)
        );
        
        toast({
          title: "Class deleted locally",
          description: `${selectedClassToEdit?.title} has been removed from your local data.`
        });
        
        // Reset state and force refresh
        setSelectedClassToEdit(null);
        setIsEditClassOpen(false);
        setForceLocalStorageOnly(true);
        setRefreshTrigger(prev => prev + 1);
      } catch (localStoreError) {
        toast({
          title: "Error",
          description: "Failed to delete class",
          variant: "destructive"
        });
      }
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

  // Function to reset all data (for troubleshooting)
  const handleResetAllData = async () => {
    try {
      await classOpenAIConfigService.clearAllData();
      toast({
        title: "Data reset",
        description: "All local class data has been reset. Refreshing..."
      });
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error resetting data:", error);
    }
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
              key={`${option.title}-${index}`}
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
                className="h-full transition-all hover:shadow-md hover:border-blue-300"
                onClick={() => handleClassClick(option)}
              >
                <CardHeader>
                  <div className="mb-4 p-2 bg-blue-300/20 rounded-lg w-fit">
                    <span className="text-4xl">{option.emoji}</span>
                  </div>
                  <CardTitle>{option.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm space-y-1">
                    {option.professor && (
                      <p className="text-muted-foreground"><span className="font-medium text-foreground">Professor:</span> {option.professor}</p>
                    )}
                    {option.classTime && (
                      <p className="text-muted-foreground"><span className="font-medium text-foreground">Time:</span> {option.classTime}</p>
                    )}
                    {option.classroom && (
                      <p className="text-muted-foreground"><span className="font-medium text-foreground">Location:</span> {option.classroom}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" className="group text-blue-500">
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

      {/* Troubleshooting option - only visible in dev mode */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 pt-4 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetAllData}
            className="text-red-500 border-red-200"
          >
            Reset All Class Data (Dev Only)
          </Button>
        </div>
      )}

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
            professor: selectedClassToEdit.professor,
            classTime: selectedClassToEdit.classTime,
            classroom: selectedClassToEdit.classroom,
            color: selectedClassToEdit.color,
            enabledWidgets: selectedClassToEdit.enabledWidgets,
            emoji: selectedClassToEdit.emoji,
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
