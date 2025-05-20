// src/pages/SuperTutor.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChatBot } from "@/components/chat/ChatBot";
import { WebChatBot, Message as ChatUIMessage } from "@/components/chat/WebChatBot";
import { Button } from "@/components/ui/button";
import { AlertCircle, Settings, Bot, Globe, Split, Loader2, MessageSquarePlus, Database as DatabaseIconLucide, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { OpenAIConfig } from "@/services/classOpenAIConfig";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client"; 
import { chatMessageService, ChatMessageApp, ChatMessageDBInsert } from "@/services/chatMessageService"; 
import { conversationService, AppConversation, ConversationDBInsert as AppConversationDBInsert } from "@/services/conversationService";
import type { User } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge"; 

import ConversationSidebar from '@/components/Supertutor/ConversationSidebar';

export interface Conversation extends Omit<AppConversation, 'last_message_at'> {
  last_message_at: string;
}

interface ActiveClassData {
  class_id: string;
  title: string;
  emoji?: string;
  enabledWidgets?: string[];
  openAIConfig?: OpenAIConfig;
}

type ChatMode = "rag" | "web" | "split";

const mapToChatUIMessage = (appMessage: ChatMessageApp): ChatUIMessage => ({
  role: appMessage.role,
  content: appMessage.content,
});

const SuperTutor = () => {
  const navigate = useNavigate();
  const [effectiveOpenAIConfig, setEffectiveOpenAIConfig] = useState<OpenAIConfig | undefined>(undefined);
  const [activeClass, setActiveClass] = useState<ActiveClassData | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false); 
  const [pageError, setPageError] = useState<string | null>(null);
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [activeMode, setActiveMode] = useState<ChatMode>("rag");

  const [conversations, setConversations] = useState<AppConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(false);
  
  const [currentChatMessages, setCurrentChatMessages] = useState<ChatMessageApp[]>([]);
  const [isLoadingChatMessages, setIsLoadingChatMessages] = useState<boolean>(false);

  const [lastSelectedRagConvoId, setLastSelectedRagConvoId] = useState<string | null>(null);
  const [lastSelectedWebConvoId, setLastSelectedWebConvoId] = useState<string | null>(null);
  const [splitViewRagMessages, setSplitViewRagMessages] = useState<ChatMessageApp[]>([]);
  const [splitViewWebMessages, setSplitViewWebMessages] = useState<ChatMessageApp[]>([]);
  const [isLoadingSplitRagMessages, setIsLoadingSplitRagMessages] = useState<boolean>(false);
  const [isLoadingSplitWebMessages, setIsLoadingSplitWebMessages] = useState<boolean>(false);
  const [isGeneratingSplitRagResponse, setIsGeneratingSplitRagResponse] = useState(false);
  const [isGeneratingSplitWebResponse, setIsGeneratingSplitWebResponse] = useState(false);

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
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => { 
    window.scrollTo(0, 0);
    setIsLoadingPage(true);
    setPageError(null);
    const activeClassDataString = sessionStorage.getItem('activeClass');

    if (activeClassDataString) {
      try {
        const parsedClass: ActiveClassData = JSON.parse(activeClassDataString);
        setActiveClass(parsedClass);
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

  useEffect(() => {
    if (selectedConversationId) {
      if (activeMode === 'rag') {
        setLastSelectedRagConvoId(selectedConversationId);
      } else if (activeMode === 'web') {
        setLastSelectedWebConvoId(selectedConversationId);
      }
    }
  }, [selectedConversationId, activeMode]);

  useEffect(() => {
    if (!user || !activeClass?.class_id || activeMode === 'split') {
      if (activeMode !== 'split') { // Only clear if not switching TO split view
        setConversations([]);
        setSelectedConversationId(null);
        setCurrentChatMessages([]);
      }
      return;
    }
    const loadConversations = async () => {
      setIsLoadingConversations(true);
      try {
        const fetchedConversations = await conversationService.fetchConversations(
          user.id,
          activeClass.class_id,
          activeMode
        );
        setConversations(fetchedConversations);
        if (fetchedConversations.length > 0) {
          if (!selectedConversationId || !fetchedConversations.find(c => c.id === selectedConversationId)) {
            setSelectedConversationId(fetchedConversations[0].id);
          }
        } else {
          setSelectedConversationId(null);
          setCurrentChatMessages([]);
        }
      } catch (error) {
        console.error("Error fetching conversations:", error);
        toast({ title: "Error", description: "Could not load conversations.", variant: "destructive" });
        setConversations([]); setSelectedConversationId(null); setCurrentChatMessages([]);
      } finally {
        setIsLoadingConversations(false);
      }
    };
    loadConversations();
  }, [user, activeClass?.class_id, activeMode, toast]);

  useEffect(() => {
    if (!selectedConversationId || !user || activeMode === 'split') {
      if (activeMode !== 'split') setCurrentChatMessages([]);
      return;
    }
    const loadMessages = async () => {
      setIsLoadingChatMessages(true);
      try {
        const messages = await chatMessageService.fetchMessagesByConversation(selectedConversationId);
        setCurrentChatMessages(messages);
      } catch (error) {
        console.error(`Error fetching messages for conversation ${selectedConversationId}:`, error);
        toast({ title: "Error", description: "Could not load messages for this chat.", variant: "destructive" });
        setCurrentChatMessages([]);
      } finally {
        setIsLoadingChatMessages(false);
      }
    };
    loadMessages();
  }, [selectedConversationId, user, toast, activeMode]);

  useEffect(() => {
    if (activeMode === 'split' && lastSelectedRagConvoId && user) {
      setIsLoadingSplitRagMessages(true);
      chatMessageService.fetchMessagesByConversation(lastSelectedRagConvoId)
        .then(setSplitViewRagMessages)
        .catch(err => {
          console.error("Error fetching split RAG messages:", err);
          toast({ title: "Split View Error", description: "Could not load Class AI chat.", variant: "destructive" });
          setSplitViewRagMessages([]);
        })
        .finally(() => setIsLoadingSplitRagMessages(false));
    }
  }, [activeMode, lastSelectedRagConvoId, user, toast]);

  useEffect(() => {
    if (activeMode === 'split' && lastSelectedWebConvoId && user) {
      setIsLoadingSplitWebMessages(true);
      chatMessageService.fetchMessagesByConversation(lastSelectedWebConvoId)
        .then(setSplitViewWebMessages)
        .catch(err => {
          console.error("Error fetching split Web messages:", err);
          toast({ title: "Split View Error", description: "Could not load Web Search chat.", variant: "destructive" });
          setSplitViewWebMessages([]);
        })
        .finally(() => setIsLoadingSplitWebMessages(false));
    }
  }, [activeMode, lastSelectedWebConvoId, user, toast]);

  const handleSelectConversation = useCallback((id: string) => { 
    setSelectedConversationId(id);
  }, []);
  const handleCreateNewConversation = useCallback(async () => { 
    if (!user || !activeClass?.class_id || activeMode === 'split') {
      toast({ title: "Cannot Create Chat", description: "User, class, or valid mode not set.", variant: "destructive" });
      return;
    }
    const newName = `New ${activeMode === 'rag' ? 'Class' : 'Web'} Chat ${
      conversations.filter(c => c.chat_mode === activeMode).length + 1
    }`;
    const payload: { name: string; class_id: string; chat_mode: "rag" | "web" } = {
      name: newName,
      class_id: activeClass.class_id,
      chat_mode: activeMode
    };
    try {
      setIsLoadingConversations(true);
      const newConversation = await conversationService.createConversation(payload, user.id);
      setConversations(prev => [newConversation, ...prev].sort((a,b) => b.last_message_at.getTime() - a.last_message_at.getTime()));
      setSelectedConversationId(newConversation.id);
      setCurrentChatMessages([]);
      toast({ title: "Chat Created", description: `"${newName}" is ready.` });
    } catch (error) {
      console.error("Error creating new conversation:", error);
      toast({ title: "Error", description: "Could not create new chat.", variant: "destructive" });
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user, activeClass?.class_id, activeMode, conversations, toast]);
  const handleRenameConversation = useCallback(async (id: string, newName: string) => { 
    if (!user) return;
    const originalName = conversations.find(c => c.id === id)?.name;
    setConversations(prev => prev.map(c => (c.id === id ? { ...c, name: newName } : c)));
    try {
      await conversationService.renameConversation(id, newName, user.id);
      toast({ title: "Chat Renamed", description: `Chat renamed to "${newName}".` });
    } catch (error) {
      console.error("Error renaming conversation:", error);
      if (originalName) {
        setConversations(prev => prev.map(c => (c.id === id ? { ...c, name: originalName } : c)));
      }
      toast({ title: "Error", description: "Could not rename chat.", variant: "destructive" });
    }
  }, [user, conversations, toast]);
  const handleDeleteConversation = useCallback(async (id: string) => { 
    if (!user) return;
    const conversationToDelete = conversations.find(c => c.id === id);
    if (!conversationToDelete) return;

    const confirmed = window.confirm(`Are you sure you want to delete the chat "${conversationToDelete.name}" and all its messages?`);
    if (!confirmed) return;
    
    const originalConversations = [...conversations];
    const originalSelectedId = selectedConversationId;
    const originalMessages = [...currentChatMessages];

    setConversations(prev => {
      const remaining = prev.filter(c => c.id !== id);
      if (selectedConversationId === id) {
        setSelectedConversationId(remaining.length > 0 ? remaining[0].id : null);
        if (remaining.length === 0) setCurrentChatMessages([]);
      }
      return remaining;
    });

    try {
      await conversationService.deleteConversation(id, user.id);
      toast({ title: "Chat Deleted", description: `"${conversationToDelete.name}" has been deleted.` });
      if (id === lastSelectedRagConvoId) setLastSelectedRagConvoId(null);
      if (id === lastSelectedWebConvoId) setLastSelectedWebConvoId(null);
    } catch (error) {
      console.error("Error deleting conversation:", error);
      setConversations(originalConversations);
      setSelectedConversationId(originalSelectedId);
      setCurrentChatMessages(originalMessages);
      toast({ title: "Error", description: "Could not delete chat.", variant: "destructive" });
    }
  }, [user, conversations, selectedConversationId, currentChatMessages, toast, lastSelectedRagConvoId, lastSelectedWebConvoId]);

  const handleMessagesChange = useCallback(async (
    newOrUpdatedMessagesFromChild: ChatUIMessage[] | ((prevMessages: ChatUIMessage[]) => ChatUIMessage[]),
    mode: 'rag' | 'web',
    instanceConversationId?: string 
  ) => {
    const targetConversationId = activeMode === 'split' ? instanceConversationId : selectedConversationId;

    if (!user || !activeClass?.class_id || !targetConversationId) {
      toast({ title: "Error", description: "Cannot save message: No active conversation context.", variant: "destructive" });
      return;
    }
    
    let messagesSource: ChatMessageApp[];
    let setMessagesFunction: React.Dispatch<React.SetStateAction<ChatMessageApp[]>>;

    if (activeMode === 'split') {
        if (mode === 'rag' && targetConversationId === lastSelectedRagConvoId) { // Ensure we're updating the correct split panel's messages
            messagesSource = splitViewRagMessages;
            setMessagesFunction = setSplitViewRagMessages;
        } else if (mode === 'web' && targetConversationId === lastSelectedWebConvoId) {
            messagesSource = splitViewWebMessages;
            setMessagesFunction = setSplitViewWebMessages;
        } else {
            console.warn(`[handleMessagesChange] Split view message change for unselected/mismatched panel. Mode: ${mode}, TargetConvoID: ${targetConversationId}`);
            return; // Don't proceed if the target doesn't match an active split panel's conversation
        }
    } else { // RAG or WEB tab
        messagesSource = currentChatMessages;
        setMessagesFunction = setCurrentChatMessages;
    }

    const newFullUIMessagesList = typeof newOrUpdatedMessagesFromChild === 'function'
      ? newOrUpdatedMessagesFromChild(messagesSource.map(mapToChatUIMessage))
      : newOrUpdatedMessagesFromChild; 
    
    const newFullAppMessagesList: ChatMessageApp[] = newFullUIMessagesList.map((uiMsg, index) => ({
      id: messagesSource[index]?.id || `temp-msg-${Date.now()}-${index}`,
      role: uiMsg.role,
      content: uiMsg.content,
      createdAt: messagesSource[index]?.createdAt || new Date(),
      conversation_id: targetConversationId,
    }));
        
    setMessagesFunction(newFullAppMessagesList);
    
    const messagesToPersist: ChatMessageApp[] = [];
    const currentMessagesContent = new Set(messagesSource.map(m => `${m.role}-${m.content}`));

    for (const appMsg of newFullAppMessagesList) {
        if (appMsg.id.startsWith('temp-msg-') || !currentMessagesContent.has(`${appMsg.role}-${appMsg.content}`)) {
            messagesToPersist.push(appMsg);
        }
    }
    
    if (messagesToPersist.length === 0) return;
    
    let lastSavedMessageDate: Date | null = null;

    for (const newMessageToSave of messagesToPersist) {
      const payload = {
        class_id: activeClass.class_id,
        chat_mode: mode, 
        role: newMessageToSave.role,
        content: newMessageToSave.content,
        conversation_id: targetConversationId,
        user_id: user.id
      } as const;
      try {
        const savedMessage = await chatMessageService.saveMessage(payload);
        if (savedMessage) {
          lastSavedMessageDate = savedMessage.createdAt;
          setMessagesFunction(prev => 
            prev.map(m => m.id === newMessageToSave.id ? savedMessage : m)
                .sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime())
          );
        }
      } catch (error) {
        console.error(`Error saving message (${newMessageToSave.role}):`, error);
        toast({ title: "Error", description: `Could not save ${newMessageToSave.role} message.`, variant: "destructive" });
      }
    }

    if (lastSavedMessageDate && targetConversationId) {
      try {
        const updatedConvo = await conversationService.updateConversationTimestamp(targetConversationId, user.id, lastSavedMessageDate);
        setConversations(prevConvos => 
            prevConvos.map(convo => convo.id === updatedConvo.id ? updatedConvo : convo)
                      .sort((a,b) => b.last_message_at.getTime() - a.last_message_at.getTime())
        );
      } catch (error) {
        console.error("Error updating conversation timestamp:", error);
      }
    }
  }, [user, activeClass?.class_id, selectedConversationId, currentChatMessages, splitViewRagMessages, splitViewWebMessages, toast, activeMode, conversations, lastSelectedRagConvoId, lastSelectedWebConvoId]);


  const handleGoToSettings = () => {
    navigate("/");
    toast({
      title: "Manage Classes",
      description: "You can edit class settings from the Home page.",
    });
  };
  
  const commonLoadingIndicator = (text: string) => (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
  
  // Restored full JSX for noConversationSelectedMessage
  const noConversationSelectedMessage = (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
        <MessageSquarePlus size={48} className="mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-1">No Chat Selected</h3>
        <p className="text-sm">Select a chat from the sidebar or create a new one to begin.</p>
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
  const tabContentWrapperClassName = "bg-card rounded-xl shadow-sm border flex flex-col flex-grow overflow-hidden min-h-0 h-full"; 
  const tabsContentClassName = "flex-grow flex flex-col overflow-hidden data-[state=inactive]:hidden min-h-0 h-full";

  const renderPanelHeader = (panelMode: 'rag' | 'web', isSplitViewContext: boolean = false) => {
    const title = panelMode === 'rag' ? "Class AI" : "Web Search AI";
    let subtitle = panelMode === 'rag' ? `About ${activeClassTitleForDisplay}` : "General web search";
    let conversationNameToDisplay: string | undefined = undefined;

    if (isSplitViewContext) {
        const convoId = panelMode === 'rag' ? lastSelectedRagConvoId : lastSelectedWebConvoId;
        if (convoId) {
            const allKnownConversations = conversations; // Use the main list for lookup
            conversationNameToDisplay = allKnownConversations.find(c => c.id === convoId)?.name;
        }
    } else if (selectedConversationId) { 
        const currentConvo = conversations.find(c => c.id === selectedConversationId);
        if (currentConvo && currentConvo.chat_mode === panelMode) {
            conversationNameToDisplay = currentConvo.name;
        }
    }
    
    if (conversationNameToDisplay) {
        const baseSubtitle = panelMode === 'rag' ? `Database Search` : "Ask me to search the web";
        subtitle = `${baseSubtitle} (Chat: ${conversationNameToDisplay})`;
    } else if (!isSplitViewContext && panelMode === 'rag') {
        subtitle = `Ask questions about ${activeClassTitleForDisplay}`;
    } else if (!isSplitViewContext && panelMode === 'web') {
        subtitle = "Ask me to search the web for supplemental information";
    }

    return (
        <div className="p-4 border-b border-slate-300 dark:border-zinc-700 flex justify-between items-center flex-shrink-0">
            <div> 
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
            </div>
            {(panelMode === 'rag' && activeClass?.openAIConfig?.vectorStoreId) && ( 
                 <Badge variant="outline" className="ml-auto flex items-center gap-1 border-blue-500 text-blue-700 dark:border-blue-400 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30">
                    <DatabaseIconLucide className="h-3 w-3" />
                    <span className="text-xs">Database Search</span>
                 </Badge>
            )}
            {(panelMode === 'web') && ( 
                 <Badge variant="outline" className="ml-auto flex items-center gap-1 border-blue-500 text-blue-700 dark:border-blue-400 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30">
                    <Globe className="h-3 w-3" />
                    <span className="text-xs">Web Search</span>
                 </Badge>
            )}
        </div>
    );
  };

  return ( // ASI Fix: Opening parenthesis on the same line as return
    <div className="flex flex-col h-[calc(100vh-var(--header-height,30px)-2rem)]">
      {!activeClass && ( <Alert variant="destructive" className="mt-0 mb-4"> <AlertCircle className="h-4 w-4" /> <AlertTitle>No Class Selected</AlertTitle> <AlertDescription> Please <Link to="/" className="underline hover:text-destructive/80">go to the homepage</Link> and select a class. </AlertDescription> </Alert> )}
      {activeClass && pageError && !effectiveOpenAIConfig?.assistantId && ( <Alert variant="default" className="bg-amber-50 border-amber-200 mt-0 mb-4"> <AlertCircle className="h-4 w-4 text-amber-700" /> <AlertTitle className="text-amber-800">Class AI Configuration Note</AlertTitle> <AlertDescription className="text-amber-700"> {pageError} <Button variant="link" size="sm" className="p-0 h-auto text-amber-700 hover:text-amber-700/80 ml-1" onClick={handleGoToSettings}> Check Class Settings </Button> </AlertDescription> </Alert> )}
      
      {activeClass && (
        <Tabs 
          value={activeMode} 
          onValueChange={(value) => {
            setActiveMode(value as ChatMode);
            if (value !== 'split') {
                setSelectedConversationId(null); 
                setCurrentChatMessages([]);
            }
          }}
          className={cn( "w-full flex flex-col flex-grow min-h-0", !pageError && "pt-2" )}
        >
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="rag" className="flex-1 gap-2 data-[state=active]:shadow-md"> <Bot className="h-4 w-4" /> Class Materials </TabsTrigger>
            <TabsTrigger value="web" className="flex-1 gap-2 data-[state=active]:shadow-md"> <Globe className="h-4 w-4" /> Web Search </TabsTrigger>
            <TabsTrigger value="split" className="flex-1 gap-2 data-[state=active]:shadow-md"> <Split className="h-4 w-4" /> Split View </TabsTrigger>
          </TabsList>

          {(activeMode === 'rag' || activeMode === 'web') && (
            <TabsContent value={activeMode} className={cn(tabsContentClassName, "mt-0")}>
              <div className={tabContentWrapperClassName}>
                {renderPanelHeader(activeMode)}
                <div className="flex flex-1 overflow-hidden"> 
                  <ConversationSidebar
                      conversations={conversations.map(conv => ({
                        ...conv,
                        last_message_at: conv.last_message_at.toISOString()
                      }))}
                      selectedConversationId={selectedConversationId}
                      onSelectConversation={handleSelectConversation}
                      onCreateNewConversation={handleCreateNewConversation}
                      onRenameConversation={handleRenameConversation}
                      onDeleteConversation={handleDeleteConversation}
                      isLoading={isLoadingConversations}
                      className="h-full flex-shrink-0 !border-t-0 !border-l-0 !border-b-0 !rounded-none border-r border-slate-300 dark:border-zinc-700" 
                  />
                  <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-card"> 
                    {selectedConversationId ? (
                      activeMode === 'rag' ? (
                        <ChatBot
                          key={`${selectedConversationId}-rag`} 
                          className="!border-0 !shadow-none !rounded-none !p-0 h-full flex flex-col" 
                          disableToasts={true}
                          suggestions={ragSuggestions.map(s => s.replace("[topic]", activeClassTitleForDisplay))}
                          knowledgeBase={activeClassTitleForDisplay}
                          openAIConfig={effectiveOpenAIConfig}
                          onResponseGenerationStateChange={setIsGeneratingResponse}
                          messages={currentChatMessages.map(mapToChatUIMessage)}
                          onMessagesChange={(newMessages) => handleMessagesChange(newMessages, 'rag')}
                          loadingIndicator={isGeneratingResponse || isLoadingChatMessages ? commonLoadingIndicator("Class AI is thinking...") : undefined}
                          placeholder="Ask about your class materials..."
                          disabled={!selectedConversationId || isGeneratingResponse}
                        />
                      ) : ( 
                        <WebChatBot
                          key={`${selectedConversationId}-web`} 
                          className="!border-0 !shadow-none !rounded-none !p-0 h-full flex flex-col"
                          disableToasts={true}
                          suggestions={webSuggestions}
                          placeholder="What would you like to search for?"
                          onResponseGenerationStateChange={setIsGeneratingResponse}
                          messages={currentChatMessages.map(mapToChatUIMessage)}
                          onMessagesChange={(newMessages) => handleMessagesChange(newMessages, 'web')}
                          loadingIndicator={isGeneratingResponse || isLoadingChatMessages ? commonLoadingIndicator("Searching the web...") : undefined}
                          disabled={!selectedConversationId || isGeneratingResponse}
                        />
                      )
                    ) : (
                      noConversationSelectedMessage 
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="split" className={cn(tabsContentClassName.replace("flex flex-col", "flex"), "mt-0")}>
            <ResizablePanelGroup
              direction="horizontal"
              className="bg-card rounded-xl shadow-sm border flex-1 flex overflow-hidden min-h-0 h-full" 
            >
              <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col overflow-hidden min-h-0">
                {renderPanelHeader('rag', true)} 
                <div className="flex-1 overflow-hidden"> 
                    <ChatBot
                        key={lastSelectedRagConvoId || 'split-rag-empty'}
                        className="!border-0 !shadow-none !rounded-none !p-0 h-full flex flex-col" 
                        disableToasts={true}
                        suggestions={ragSuggestions.map(s => s.replace("[topic]", activeClassTitleForDisplay))}
                        knowledgeBase={activeClassTitleForDisplay}
                        openAIConfig={effectiveOpenAIConfig}
                        onResponseGenerationStateChange={setIsGeneratingSplitRagResponse}
                        messages={splitViewRagMessages.map(mapToChatUIMessage)}
                        onMessagesChange={(newMessages) => handleMessagesChange(newMessages, 'rag', lastSelectedRagConvoId || undefined)}
                        loadingIndicator={isGeneratingSplitRagResponse || isLoadingSplitRagMessages ? commonLoadingIndicator("Class AI is thinking...") : undefined}
                        placeholder="Ask about class materials..."
                        disabled={!lastSelectedRagConvoId || isGeneratingSplitRagResponse}
                    />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col overflow-hidden min-h-0">
                {renderPanelHeader('web', true)}
                <div className="flex-1 overflow-hidden"> 
                    <WebChatBot
                        key={lastSelectedWebConvoId || 'split-web-empty'}
                        className="!border-0 !shadow-none !rounded-none !p-0 h-full flex flex-col" 
                        disableToasts={true}
                        suggestions={webSuggestions}
                        placeholder="Search the web..."
                        onResponseGenerationStateChange={setIsGeneratingSplitWebResponse}
                        messages={splitViewWebMessages.map(mapToChatUIMessage)}
                        onMessagesChange={(newMessages) => handleMessagesChange(newMessages, 'web', lastSelectedWebConvoId || undefined)}
                        loadingIndicator={isGeneratingSplitWebResponse || isLoadingSplitWebMessages ? commonLoadingIndicator("Searching the web...") : undefined}
                        disabled={!lastSelectedWebConvoId || isGeneratingSplitWebResponse}
                    />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default SuperTutor;
