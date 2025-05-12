// src/pages/SuperTutor.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom"; // Added Link import
import { ChatBot } from "@/components/chat/ChatBot";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { AlertCircle, Settings, Bot, Database as DatabaseIcon, ExternalLink, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { OpenAIConfig } from "@/services/classOpenAIConfig";

// This interface should match the structure stored in sessionStorage by HomePage.tsx
interface ActiveClassData {
  class_id: string;
  title: string;
  emoji?: string;
  enabledWidgets?: string[];
  openAIConfig?: OpenAIConfig; // This will contain assistantId and vectorStoreId
}

const SuperTutor = () => {
  const navigate = useNavigate();
  const [effectiveOpenAIConfig, setEffectiveOpenAIConfig] = useState<OpenAIConfig | undefined>(undefined);
  const [activeClassTitle, setActiveClassTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const suggestions = [
    "Explain the main concepts of [topic]",
    "Can you summarize [specific reading]?",
    "What are some practice questions for [chapter]?",
    "Help me understand the difference between X and Y.",
  ];

  useEffect(() => {
    window.scrollTo(0, 0);

    setIsLoading(true);
    setError(null);
    const activeClassDataString = sessionStorage.getItem('activeClass');

    if (activeClassDataString) {
      try {
        const parsedClass: ActiveClassData = JSON.parse(activeClassDataString);
        setActiveClassTitle(parsedClass.title || "your current class");

        if (parsedClass.openAIConfig && parsedClass.openAIConfig.assistantId) {
          setEffectiveOpenAIConfig({
            assistantId: parsedClass.openAIConfig.assistantId,
            vectorStoreId: parsedClass.openAIConfig.vectorStoreId,
          });
          console.log(`SuperTutor: Using Assistant ID ${parsedClass.openAIConfig.assistantId} and Vector Store ID ${parsedClass.openAIConfig.vectorStoreId} for class "${parsedClass.title}".`);
        } else {
          console.warn(`SuperTutor: No assistantId found in activeClass session data for "${parsedClass.title}". RAG features will be limited.`);
          setEffectiveOpenAIConfig(undefined);
           setError("This class is not fully set up for AI-powered tutoring (missing Assistant configuration). Responses will use general knowledge.");
        }
      } catch (e) {
        console.error("SuperTutor: Error parsing activeClass from sessionStorage:", e);
        setActiveClassTitle("your class");
        setEffectiveOpenAIConfig(undefined);
        setError("Could not load class configuration. Please re-select your class from the homepage.");
        toast({
          title: "Configuration Error",
          description: "Failed to load class details. Try going to Home and selecting your class again.",
          variant: "destructive",
        });
      }
    } else {
      setActiveClassTitle(null);
      setEffectiveOpenAIConfig(undefined);
      console.log("SuperTutor: No active class found in sessionStorage.");
      setError("No active class selected. Please go to the homepage and select a class to use the Super Tutor.");
    }
    setIsLoading(false);
  }, [toast]);

  const handleGoToSettings = () => {
    navigate("/");
    toast({
      title: "Manage Classes",
      description: "You can edit class settings from the Home page.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading Super Tutor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Tutor"
        description={activeClassTitle
          ? `AI-powered learning assistant for ${activeClassTitle}`
          : "Your AI-powered learning assistant."
        }
      />

      {!activeClassTitle && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Class Selected</AlertTitle>
          <AlertDescription>
            Please <Link to="/" className="underline hover:text-destructive/80">go to the homepage</Link> and select a class to use the Super Tutor.
          </AlertDescription>
        </Alert>
      )}

      {activeClassTitle && error && (
         <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration Issue</AlertTitle>
          <AlertDescription>
            {error}
            <Button variant="link" size="sm" className="p-0 h-auto text-destructive hover:text-destructive/80 ml-1" onClick={handleGoToSettings}>
              Check Class Settings
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {activeClassTitle && !error && effectiveOpenAIConfig?.assistantId && (
        <div className={'bg-blue-50 border-blue-200 border rounded-md p-4 text-sm'}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className={'text-blue-600 h-4 w-4'} />
              <p className="font-medium text-blue-700">
                Using custom AI assistant for {activeClassTitle}
              </p>
            </div>
            <Badge variant={"default"} className={"bg-blue-500"}>
              {effectiveOpenAIConfig.assistantId.substring(0, 12)}...
            </Badge>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Responses will be based on your class materials linked to this assistant.
          </p>
        </div>
      )}
      
      {activeClassTitle && !error && !effectiveOpenAIConfig?.assistantId && (
         <Alert variant="default" className="bg-amber-50 border-amber-200">
            <Bot className="h-4 w-4 text-amber-700" />
            <AlertTitle className="text-amber-800">General Knowledge Mode</AlertTitle>
            <AlertDescription className="text-amber-700">
              This class doesn't have a dedicated AI assistant configured.
              Super Tutor will use its general knowledge. For class-specific help,
              ensure an Assistant ID is set up for "{activeClassTitle}".
              <Button variant="link" size="sm" className="p-0 h-auto text-amber-700 hover:text-amber-700/80 ml-1" onClick={handleGoToSettings}>
                Check Settings
            </Button>
            </AlertDescription>
        </Alert>
      )}


      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border">
        <ChatBot
          disableToasts={true}
          suggestions={suggestions.map(s => s.replace("[topic]", activeClassTitle || "the subject").replace("[specific reading]", "a specific reading").replace("[chapter]", "a chapter"))}
          title={activeClassTitle ? `${activeClassTitle} AI Tutor` : "AI Tutor"}
          subtitle={activeClassTitle ? `Ask questions about ${activeClassTitle}` : "Ask general questions"}
          knowledgeBase={activeClassTitle || "General Knowledge"}
          openAIConfig={effectiveOpenAIConfig}
          onResponseGenerationStateChange={setIsGeneratingResponse}
          loadingIndicator={
            isGeneratingResponse && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-pulse flex items-center space-x-2">
                  <div className="h-2 w-2 bg-primary rounded-full animation-delay-0"></div>
                  <div className="h-2 w-2 bg-primary rounded-full animate-ping animation-delay-200"></div>
                  <div className="h-2 w-2 bg-primary rounded-full animation-delay-400"></div>
                  <span className="text-sm text-muted-foreground ml-2">AI is thinking...</span>
                </div>
              </div>
            )
          }
        />
      </div>
    </div>
  );
};

export default SuperTutor;