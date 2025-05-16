// src/pages/SuperTutor.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChatBot } from "@/components/chat/ChatBot";
import { WebChatBot, Message as ChatUIMessage } from "@/components/chat/WebChatBot";
// PageHeader import is no longer needed
// import { PageHeader } from "@/components/layout/PageHeader"; 
import { Button } from "@/components/ui/button";
import { AlertCircle, Settings, Bot, Globe, Split, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { OpenAIConfig } from "@/services/classOpenAIConfig";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

interface ActiveClassData {
  class_id: string;
  title: string;
  emoji?: string;
  enabledWidgets?: string[];
  openAIConfig?: OpenAIConfig;
}

type ChatMode = "rag" | "web" | "split";

const SuperTutor = () => {
  const navigate = useNavigate();
  const [effectiveOpenAIConfig, setEffectiveOpenAIConfig] = useState<OpenAIConfig | undefined>(undefined);
  const [activeClassTitle, setActiveClassTitle] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isGeneratingRagResponse, setIsGeneratingRagResponse] = useState(false);
  const [isGeneratingWebResponse, setIsGeneratingWebResponse] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const { toast } = useToast();

  const [activeMode, setActiveMode] = useState<ChatMode>("rag");
  const [ragMessages, setRagMessages] = useState<ChatUIMessage[]>([]);
  const [webMessages, setWebMessages] = useState<ChatUIMessage[]>([]);

  const ragSuggestions = [
    "Explain the main concepts of [topic]",
    "Can you summarize [specific reading]?",
    "What are some practice questions for [chapter]?",
  ];

  const webSuggestions = [
    "What's the latest research on [topic]?",
    "Find information about [current event]",
    "How do I solve [specific problem]?",
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
    setIsLoadingPage(true);
    setPageError(null);
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
        } else {
          setEffectiveOpenAIConfig(undefined);
          setPageError("This class is not fully set up for Class AI (missing Assistant configuration). Class AI responses will use general knowledge.");
        }
      } catch (e) {
        console.error("SuperTutor: Error parsing activeClass from sessionStorage:", e);
        setActiveClassTitle("your class");
        setEffectiveOpenAIConfig(undefined);
        setPageError("Could not load class configuration. Please re-select your class from the homepage.");
        toast({
          title: "Configuration Error",
          description: "Failed to load class details. Try going to Home and selecting your class again.",
          variant: "destructive",
        });
      }
    } else {
      setActiveClassTitle(null);
      setEffectiveOpenAIConfig(undefined);
      setPageError("No active class selected. Please go to the homepage and select a class to use the Super Tutor.");
    }
    setIsLoadingPage(false);
  }, [toast]);

  const handleGoToSettings = () => {
    navigate("/");
    toast({
      title: "Manage Classes",
      description: "You can edit class settings from the Home page.",
    });
  };

  const commonLoadingIndicator = (text: string) => (
    <div className="flex items-center justify-center py-4">
      <div className="animate-pulse flex items-center space-x-2">
        <div className="h-2 w-2 bg-primary rounded-full animation-delay-0"></div>
        <div className="h-2 w-2 bg-primary rounded-full animate-ping animation-delay-200"></div>
        <div className="h-2 w-2 bg-primary rounded-full animation-delay-400"></div>
        <span className="text-sm text-muted-foreground ml-2">{text}</span>
      </div>
    </div>
  );

  if (isLoadingPage) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading Super Tutor...</p>
      </div>
    );
  }

  const tabContentWrapperClassName = "bg-card p-0 rounded-xl shadow-sm border flex-grow flex flex-col overflow-hidden min-h-0 h-full"; 
  const tabsContentClassName = "flex-grow flex flex-col overflow-hidden data-[state=inactive]:hidden min-h-0 h-full";


  return (
    // MODIFICATION: Removed `space-y-6` from className to allow chat to take full height.
    // The height calculation h-[calc(100vh-var(--header-height,60px)-2rem)] is designed to fill the space
    // below the main app header and within the main content area's padding.
    <div className="flex flex-col h-[calc(100vh-var(--header-height,30px)-2rem)]">
      {/* MODIFICATION: PageHeader component removed */}
      {/* <PageHeader
        title="Super Tutor"
        description={activeClassTitle
          ? `AI learning assistant for ${activeClassTitle}`
          : "Your AI-powered learning assistant."
        }
      /> 
      */}

      {!activeClassTitle && (
        // This Alert will now be at the very top if no class is selected.
        <Alert variant="destructive" className="mt-0 mb-4"> {/* Adjusted margin if it's the first element */}
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Class Selected</AlertTitle>
          <AlertDescription>
            Please <Link to="/" className="underline hover:text-destructive/80">go to the homepage</Link> and select a class.
          </AlertDescription>
        </Alert>
      )}

      {activeClassTitle && pageError && !effectiveOpenAIConfig?.assistantId && (
         <Alert variant="default" className="bg-amber-50 border-amber-200 mt-0 mb-4"> {/* Adjusted margin */}
            <AlertCircle className="h-4 w-4 text-amber-700" />
            <AlertTitle className="text-amber-800">Class AI Configuration Note</AlertTitle>
            <AlertDescription className="text-amber-700">
              {pageError}
              <Button variant="link" size="sm" className="p-0 h-auto text-amber-700 hover:text-amber-700/80 ml-1" onClick={handleGoToSettings}>
                Check Class Settings
            </Button>
            </AlertDescription>
        </Alert>
      )}
      
      {activeClassTitle && (
        // The Tabs component will now be the primary element filling the space.
        // Added pt-2 if PageHeader is removed and there are no alerts, to give some top padding.
        // If alerts are present, their mb-4 will provide spacing.
        <Tabs 
          value={activeMode} 
          onValueChange={(value) => setActiveMode(value as ChatMode)} 
          className={cn(
            "w-full flex flex-col flex-grow min-h-0",
            !pageError && activeClassTitle && "pt-2" // Add some padding if no alerts are shown above
          )}
        >
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="rag" className="flex-1 gap-2 data-[state=active]:shadow-md">
              <Bot className="h-4 w-4" /> Class Materials
            </TabsTrigger>
            <TabsTrigger value="web" className="flex-1 gap-2 data-[state=active]:shadow-md">
              <Globe className="h-4 w-4" /> Web Search
            </TabsTrigger>
            <TabsTrigger value="split" className="flex-1 gap-2 data-[state=active]:shadow-md">
              <Split className="h-4 w-4" /> Split View
            </TabsTrigger>
          </TabsList>

          {/* TabsContent now directly uses mt-0 if it's the first element after TabsList */}
          <TabsContent value="rag" className={cn(tabsContentClassName, "mt-0")}>
            <div className={tabContentWrapperClassName}>
              <ChatBot
                disableToasts={true}
                suggestions={ragSuggestions.map(s => s.replace("[topic]", activeClassTitle || "the subject"))}
                title="Class AI"
                subtitle={`Ask questions about ${activeClassTitle || "your class materials"}`}
                knowledgeBase={activeClassTitle || "Class Materials"}
                openAIConfig={effectiveOpenAIConfig}
                onResponseGenerationStateChange={setIsGeneratingRagResponse}
                messages={ragMessages}
                onMessagesChange={setRagMessages}
                loadingIndicator={isGeneratingRagResponse ? commonLoadingIndicator("Class AI is thinking...") : undefined}
                placeholder="Ask about your class materials..."
              />
            </div>
          </TabsContent>

          <TabsContent value="web" className={cn(tabsContentClassName, "mt-0")}>
            <div className={tabContentWrapperClassName}>
              <WebChatBot 
                disableToasts={true}
                suggestions={webSuggestions}
                title="Web Search AI"
                subtitle="Ask me to search the web for supplemental information"
                placeholder="What would you like to search for?"
                onResponseGenerationStateChange={setIsGeneratingWebResponse}
                messages={webMessages}
                onMessagesChange={setWebMessages}
                loadingIndicator={isGeneratingWebResponse ? commonLoadingIndicator("Searching the web...") : undefined}
              />
            </div>
          </TabsContent>

          <TabsContent value="split" className={cn(tabsContentClassName, "mt-0")}>
            <ResizablePanelGroup
              direction="horizontal"
              className="rounded-xl border shadow-sm flex-1 flex overflow-hidden min-h-0 h-full" 
            >
              <ResizablePanel defaultSize={50} minSize={30} className="bg-card flex flex-col overflow-hidden min-h-0">
                <ChatBot
                  disableToasts={true}
                  suggestions={ragSuggestions.map(s => s.replace("[topic]", activeClassTitle || "the subject"))}
                  title="Class AI"
                  subtitle={`About ${activeClassTitle || "class materials"}`}
                  knowledgeBase={activeClassTitle || "Class Materials"}
                  openAIConfig={effectiveOpenAIConfig}
                  onResponseGenerationStateChange={setIsGeneratingRagResponse}
                  messages={ragMessages}
                  onMessagesChange={setRagMessages}
                  loadingIndicator={isGeneratingRagResponse ? commonLoadingIndicator("Class AI is thinking...") : undefined}
                  placeholder="Ask about class materials..."
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={30} className="bg-card flex flex-col overflow-hidden min-h-0">
                <WebChatBot 
                  disableToasts={true}
                  suggestions={webSuggestions}
                  title="Web Search AI"
                  subtitle="General web search"
                  placeholder="Search the web..."
                  onResponseGenerationStateChange={setIsGeneratingWebResponse}
                  messages={webMessages}
                  onMessagesChange={setWebMessages}
                  loadingIndicator={isGeneratingWebResponse ? commonLoadingIndicator("Searching the web...") : undefined}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default SuperTutor;
