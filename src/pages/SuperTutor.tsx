// src/pages/SuperTutor.tsx
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChatBot } from "@/components/chat/ChatBot";
import { WebChatBot, Message as ChatUIMessage } from "@/components/chat/WebChatBot";
import { Button } from "@/components/ui/button";
import { AlertCircle, Settings, Bot, Globe, Split, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { OpenAIConfig } from "@/services/classOpenAIConfig";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client"; // For user session
import { chatMessageService, ChatMessageApp, ChatMessageDBInsert } from "@/services/chatMessageService"; // Import the new service and types
import type { User } from "@supabase/supabase-js";


interface ActiveClassData {
  class_id: string;
  title: string;
  emoji?: string;
  enabledWidgets?: string[];
  openAIConfig?: OpenAIConfig;
}

type ChatMode = "rag" | "web" | "split";

// Helper to map ChatMessageApp to ChatUIMessage
const mapToChatUIMessage = (appMessage: ChatMessageApp): ChatUIMessage => ({
  role: appMessage.role,
  content: appMessage.content,
  // id: appMessage.id // ChatUIMessage doesn't have id, but ChatMessageApp does
});

const SuperTutor = () => {
  const navigate = useNavigate();
  const [effectiveOpenAIConfig, setEffectiveOpenAIConfig] = useState<OpenAIConfig | undefined>(undefined);
  const [activeClass, setActiveClass] = useState<ActiveClassData | null>(null); // Store the whole activeClass object
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isGeneratingRagResponse, setIsGeneratingRagResponse] = useState(false);
  const [isGeneratingWebResponse, setIsGeneratingWebResponse] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);

  const [activeMode, setActiveMode] = useState<ChatMode>("rag");
  
  // Use ChatMessageApp for state to include IDs and timestamps for persistence
  const [ragMessages, setRagMessages] = useState<ChatMessageApp[]>([]);
  const [webMessages, setWebMessages] = useState<ChatMessageApp[]>([]);
  const [isLoadingRagHistory, setIsLoadingRagHistory] = useState(false);
  const [isLoadingWebHistory, setIsLoadingWebHistory] = useState(false);

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

  // Effect to get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getCurrentUser();
    // No need for onAuthStateChange here if AppLayout/AuthGuard handles global user state
  }, []);

  // Effect to load active class and its initial config
  useEffect(() => {
    window.scrollTo(0, 0);
    setIsLoadingPage(true);
    setPageError(null);
    const activeClassDataString = sessionStorage.getItem('activeClass');

    if (activeClassDataString) {
      try {
        const parsedClass: ActiveClassData = JSON.parse(activeClassDataString);
        setActiveClass(parsedClass); // Set the full activeClass object

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
        setActiveClass(null);
        setEffectiveOpenAIConfig(undefined);
        setPageError("Could not load class configuration. Please re-select your class from the homepage.");
        toast({
          title: "Configuration Error",
          description: "Failed to load class details. Try going to Home and selecting your class again.",
          variant: "destructive",
        });
      }
    } else {
      setActiveClass(null);
      setEffectiveOpenAIConfig(undefined);
      setPageError("No active class selected. Please go to the homepage and select a class to use the Super Tutor.");
    }
    setIsLoadingPage(false);
  }, [toast]);

  // Effect to fetch chat history when activeClass or activeMode changes
  const loadChatHistory = useCallback(async () => {
    if (!user || !activeClass?.class_id) {
      setRagMessages([]);
      setWebMessages([]);
      return;
    }

    if (activeMode === 'rag' || activeMode === 'split') {
      setIsLoadingRagHistory(true);
      try {
        const fetchedMessages = await chatMessageService.fetchMessages(activeClass.class_id, 'rag');
        setRagMessages(fetchedMessages);
      } catch (e) {
        console.error("Error fetching RAG chat history:", e);
        toast({ title: "Error", description: "Could not load Class AI chat history.", variant: "destructive" });
      } finally {
        setIsLoadingRagHistory(false);
      }
    }

    if (activeMode === 'web' || activeMode === 'split') {
      setIsLoadingWebHistory(true);
      try {
        const fetchedMessages = await chatMessageService.fetchMessages(activeClass.class_id, 'web');
        setWebMessages(fetchedMessages);
      } catch (e) {
        console.error("Error fetching Web chat history:", e);
        toast({ title: "Error", description: "Could not load Web Search chat history.", variant: "destructive" });
      } finally {
        setIsLoadingWebHistory(false);
      }
    }
  }, [user, activeClass?.class_id, activeMode, toast]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);


  // Unified handler for when ChatBot or WebChatBot internal state changes (new messages added)
  // This will be responsible for persisting the new messages.
  const handleMessagesChange = useCallback(async (
    newMessagesOrUpdater: ChatUIMessage[] | ((prevMessages: ChatUIMessage[]) => ChatUIMessage[]),
    mode: 'rag' | 'web'
  ) => {
    if (!user || !activeClass?.class_id) return;

    const currentMessages = mode === 'rag' ? ragMessages : webMessages;
    const updatedUIMessages = typeof newMessagesOrUpdater === 'function'
      ? newMessagesOrUpdater(currentMessages.map(mapToChatUIMessage))
      : newMessagesOrUpdater;

    // Update the local state first for immediate UI feedback
    const updatedAppMessages: ChatMessageApp[] = updatedUIMessages.map((uiMsg, index) => {
        // Try to find existing message by index or content if IDs are temporary
        const existingAppMsg = currentMessages[index];
        return {
            id: existingAppMsg?.id || `temp-${mode}-${Date.now()}-${index}`, // Keep existing ID or generate temp
            role: uiMsg.role,
            content: uiMsg.content,
            createdAt: existingAppMsg?.createdAt || new Date(), // Keep existing date or set new
        };
    });

    if (mode === 'rag') {
      setRagMessages(updatedAppMessages);
    } else {
      setWebMessages(updatedAppMessages);
    }

    // Identify and save only the new messages
    // A simple way: if the new array is longer, the last one or two messages are new.
    if (updatedAppMessages.length > currentMessages.length) {
      const newMessagesToSave = updatedAppMessages.slice(currentMessages.length);
      
      for (const newMessage of newMessagesToSave) {
        if (newMessage.id.startsWith(`temp-${mode}`)) { // Only save if it's a new temp message
          try {
            const payload: Omit<ChatMessageDBInsert, 'user_id' | 'id' | 'created_at'> = {
              class_id: activeClass.class_id,
              chat_mode: mode,
              role: newMessage.role,
              content: newMessage.content,
            };
            // The service will add user_id and handle created_at
            const savedMessage = await chatMessageService.saveMessage(payload);
            if (savedMessage) {
              // Optionally, update the message in local state with the real ID and DB timestamp
              if (mode === 'rag') {
                setRagMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, id: savedMessage.id, createdAt: new Date(savedMessage.created_at) } : m));
              } else {
                setWebMessages(prev => prev.map(m => m.id === newMessage.id ? { ...m, id: savedMessage.id, createdAt: new Date(savedMessage.created_at) } : m));
              }
            }
          } catch (error) {
            console.error(`Error saving ${mode} message:`, error);
            toast({ title: "Error", description: `Could not save ${mode} chat message.`, variant: "destructive" });
            // Optionally, remove the unsaved message from UI or mark it as unsaved
          }
        }
      }
    }
  }, [user, activeClass?.class_id, ragMessages, webMessages, toast]);


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
      <div className="flex justify-center items-center min-h-[calc(100vh-var(--header-height,60px)-2rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading Super Tutor...</p>
      </div>
    );
  }
  
  const activeClassTitleForDisplay = activeClass?.title || "your current class";

  const tabContentWrapperClassName = "bg-card p-0 rounded-xl shadow-sm border flex-grow flex flex-col overflow-hidden min-h-0 h-full"; 
  const tabsContentClassName = "flex-grow flex flex-col overflow-hidden data-[state=inactive]:hidden min-h-0 h-full";

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height,30px)-2rem)]">
      {!activeClass && (
        <Alert variant="destructive" className="mt-0 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Class Selected</AlertTitle>
          <AlertDescription>
            Please <Link to="/" className="underline hover:text-destructive/80">go to the homepage</Link> and select a class.
          </AlertDescription>
        </Alert>
      )}

      {activeClass && pageError && !effectiveOpenAIConfig?.assistantId && (
         <Alert variant="default" className="bg-amber-50 border-amber-200 mt-0 mb-4">
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
      
      {activeClass && (
        <Tabs 
          value={activeMode} 
          onValueChange={(value) => setActiveMode(value as ChatMode)} 
          className={cn(
            "w-full flex flex-col flex-grow min-h-0",
            !pageError && "pt-2" 
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

          <TabsContent value="rag" className={cn(tabsContentClassName, "mt-0")}>
            <div className={tabContentWrapperClassName}>
              <ChatBot
                disableToasts={true}
                suggestions={ragSuggestions.map(s => s.replace("[topic]", activeClassTitleForDisplay))}
                title="Class AI"
                subtitle={`Ask questions about ${activeClassTitleForDisplay}`}
                knowledgeBase={activeClassTitleForDisplay}
                openAIConfig={effectiveOpenAIConfig}
                onResponseGenerationStateChange={setIsGeneratingRagResponse}
                messages={ragMessages.map(mapToChatUIMessage)} // Pass mapped messages
                onMessagesChange={(updater) => handleMessagesChange(updater, 'rag')} // Pass unified handler
                loadingIndicator={isGeneratingRagResponse || isLoadingRagHistory ? commonLoadingIndicator("Class AI is thinking...") : undefined}
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
                messages={webMessages.map(mapToChatUIMessage)} // Pass mapped messages
                onMessagesChange={(updater) => handleMessagesChange(updater, 'web')} // Pass unified handler
                loadingIndicator={isGeneratingWebResponse || isLoadingWebHistory ? commonLoadingIndicator("Searching the web...") : undefined}
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
                  suggestions={ragSuggestions.map(s => s.replace("[topic]", activeClassTitleForDisplay))}
                  title="Class AI"
                  subtitle={`About ${activeClassTitleForDisplay}`}
                  knowledgeBase={activeClassTitleForDisplay}
                  openAIConfig={effectiveOpenAIConfig}
                  onResponseGenerationStateChange={setIsGeneratingRagResponse}
                  messages={ragMessages.map(mapToChatUIMessage)}
                  onMessagesChange={(updater) => handleMessagesChange(updater, 'rag')}
                  loadingIndicator={isGeneratingRagResponse || isLoadingRagHistory ? commonLoadingIndicator("Class AI is thinking...") : undefined}
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
                  messages={webMessages.map(mapToChatUIMessage)}
                  onMessagesChange={(updater) => handleMessagesChange(updater, 'web')}
                  loadingIndicator={isGeneratingWebResponse || isLoadingWebHistory ? commonLoadingIndicator("Searching the web...") : undefined}
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
