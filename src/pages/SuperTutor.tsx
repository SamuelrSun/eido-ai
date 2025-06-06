// src/pages/SuperTutor.tsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChatBot, Message as ChatUIMessage_ChatBot } from "@/components/chat/ChatBot";
import { WebChatBot, Message as ChatUIMessage_Web } from "@/components/chat/WebChatBot";
import { Button } from "@/components/ui/button";
import { AlertCircle, Bot, Globe, Split, Loader2, MessageSquarePlus, Database as DatabaseIconLucide, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { OpenAIConfig } from "@/services/classOpenAIConfig";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { chatMessageService, ChatMessageApp } from "@/services/chatMessageService";
import { conversationService, AppConversation } from "@/services/conversationService";
import type { User } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import ConversationSidebar from '@/components/Supertutor/ConversationSidebar';

export interface Conversation extends Omit<AppConversation, 'last_message_at' | 'created_at' | 'updated_at'> {
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

const mapToChatUIMessage = (appMessage: ChatMessageApp): ChatUIMessage_ChatBot => ({
  role: appMessage.role,
  content: appMessage.content,
});

const generateChatTitle = async (firstMessage: string): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-title', {
      body: { query: firstMessage },
    });

    if (error) {
      console.error("Error generating title via Edge Function:", error);
      return firstMessage.split(' ').slice(0, 5).join(' ');
    }
    return data.title;
  } catch (e) {
    console.error("Exception while calling generate-title function:", e);
    return firstMessage.split(' ').slice(0, 5).join(' ');
  }
};

const SuperTutor = () => {
  const navigate = useNavigate();
  const [activeClass, setActiveClass] = useState<ActiveClassData | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false); 
  const [pageError, setPageError] = useState<string | null>(null);
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [activeMode, setActiveMode] = useState<ChatMode>("rag");

  // FIX: Use separate state for each conversation type
  const [ragConversations, setRagConversations] = useState<AppConversation[]>([]);
  const [webConversations, setWebConversations] = useState<AppConversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(false);
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
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

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [conversationPendingDeletion, setConversationPendingDeletion] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);


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
        if (!parsedClass.class_id) {
          setPageError("The selected class is missing a required ID. Please re-select the class from the homepage.");
        }
      } catch (e) {
        setPageError("Could not load class configuration. Please re-select your class from the homepage.");
        toast({
          title: "Configuration Error",
          description: "Failed to load class details. Try going to Home and selecting your class again.",
          variant: "destructive",
        });
      }
    } else {
      setPageError("No active class selected. Please go to the homepage and select a class to use the Super Tutor.");
    }
    setIsLoadingPage(false);
  }, [toast]);
  
  // FIX: This effect now fetches both RAG and Web conversations on load
  useEffect(() => {
    if (!user || !activeClass?.class_id) return;

    const fetchAllConversationTypes = async () => {
      setIsLoadingConversations(true);
      try {
        const [ragData, webData] = await Promise.all([
          conversationService.fetchConversations(user.id, activeClass.class_id, 'rag'),
          conversationService.fetchConversations(user.id, activeClass.class_id, 'web')
        ]);
        setRagConversations(ragData);
        setWebConversations(webData);

        // Update last selected IDs for split view
        if (ragData.length > 0) setLastSelectedRagConvoId(ragData[0].id);
        if (webData.length > 0) setLastSelectedWebConvoId(webData[0].id);

        // Set the initial selected conversation based on the active tab
        if (activeMode === 'rag') {
          setSelectedConversationId(ragData.length > 0 ? ragData[0].id : null);
        } else if (activeMode === 'web') {
          setSelectedConversationId(webData.length > 0 ? webData[0].id : null);
        }

      } catch (error) {
        console.error("Error pre-fetching conversations:", error);
        toast({ title: "Error", description: "Could not load conversation lists.", variant: "destructive" });
      } finally {
        setIsLoadingConversations(false);
      }
    };

    fetchAllConversationTypes();
  }, [user, activeClass?.class_id]);

  const conversations = activeMode === 'rag' ? ragConversations : webConversations;

  useEffect(() => {
    if (selectedConversationId) {
      if (activeMode === 'rag') setLastSelectedRagConvoId(selectedConversationId);
      else if (activeMode === 'web') setLastSelectedWebConvoId(selectedConversationId);
    }
  }, [selectedConversationId, activeMode]);

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
        toast({ title: "Error", description: "Could not load messages for this chat.", variant: "destructive" });
      } finally {
        setIsLoadingChatMessages(false);
      }
    };
    loadMessages();
  }, [selectedConversationId, user, activeMode, toast]);

  useEffect(() => {
    if (activeMode === 'split' && lastSelectedRagConvoId && user) {
      setIsLoadingSplitRagMessages(true);
      chatMessageService.fetchMessagesByConversation(lastSelectedRagConvoId)
        .then(setSplitViewRagMessages)
        .catch(err => {
           console.error("Error fetching split RAG messages:", err);
           setSplitViewRagMessages([]);
        })
        .finally(() => setIsLoadingSplitRagMessages(false));
    } else if (activeMode !== 'split') {
        setSplitViewRagMessages([]);
    }
  }, [activeMode, lastSelectedRagConvoId, user]);

  useEffect(() => {
    if (activeMode === 'split' && lastSelectedWebConvoId && user) {
      setIsLoadingSplitWebMessages(true);
      chatMessageService.fetchMessagesByConversation(lastSelectedWebConvoId)
        .then(setSplitViewWebMessages)
        .catch(err => {
          console.error("Error fetching split Web messages:", err);
          setSplitViewWebMessages([]);
        })
        .finally(() => setIsLoadingSplitWebMessages(false));
    } else if (activeMode !== 'split') {
        setSplitViewWebMessages([]);
    }
  }, [activeMode, lastSelectedWebConvoId, user]);
  
  const handleSelectConversation = useCallback((id: string) => { setSelectedConversationId(id); }, []);

  const handleCreateNewConversation = useCallback(async () => {
    if (!user || !activeClass?.class_id || activeMode === 'split') return;
    const currentList = activeMode === 'rag' ? ragConversations : webConversations;
    const newName = `New ${activeMode === 'rag' ? 'Class' : 'Web'} Chat ${currentList.length + 1}`;
    const payload = { name: newName, class_id: activeClass.class_id, chat_mode: activeMode, chatbot_type: activeMode };
    try {
      setIsLoadingConversations(true);
      const newConversation = await conversationService.createConversation(payload, user.id);
      
      const setConversations = activeMode === 'rag' ? setRagConversations : setWebConversations;
      setConversations(prev => [newConversation, ...prev].sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()));
      
      setSelectedConversationId(newConversation.id);
      setCurrentChatMessages([]);
    } catch (error) {
      toast({ title: "Error", description: "Could not create new chat.", variant: "destructive" });
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user, activeClass?.class_id, activeMode, ragConversations, webConversations, toast]);

  const handleRenameConversation = useCallback(async (id: string, newName: string) => {
    if (!user) return;
    const listToUpdate = activeMode === 'rag' ? ragConversations : webConversations;
    const setListToUpdate = activeMode === 'rag' ? setRagConversations : setWebConversations;

    const originalName = listToUpdate.find(c => c.id === id)?.name;
    setListToUpdate(prev => prev.map(c => (c.id === id ? { ...c, name: newName } : c)));
    try {
      await conversationService.renameConversation(id, newName, user.id);
      toast({ title: "Chat Renamed", description: `Chat renamed to "${newName}".` });
    } catch (error) {
      if (originalName) setListToUpdate(prev => prev.map(c => (c.id === id ? { ...c, name: originalName } : c)));
      toast({ title: "Error", description: "Could not rename chat.", variant: "destructive" });
    }
  }, [user, activeMode, ragConversations, webConversations, toast]);

  const handleOpenDeleteDialog = (id: string, name: string) => {
    setConversationPendingDeletion({ id, name });
    setIsDeleteConfirmOpen(true);
  };
  
  const confirmDeleteConversation = async () => {
    if (!user || !conversationPendingDeletion) return;
    const { id: idToDelete, name: nameToDelete } = conversationPendingDeletion;
    setIsDeletingConversation(true);

    const listToUpdate = activeMode === 'rag' ? ragConversations : webConversations;
    const setListToUpdate = activeMode === 'rag' ? setRagConversations : setWebConversations;
    const originalConversations = [...listToUpdate];
    
    setListToUpdate(prev => prev.filter(c => c.id !== idToDelete));
    if (selectedConversationId === idToDelete) {
      const remainingConvos = originalConversations.filter(c => c.id !== idToDelete);
      setSelectedConversationId(remainingConvos.length > 0 ? remainingConvos[0].id : null);
    }

    try {
      await conversationService.deleteConversation(idToDelete, user.id);
      toast({ title: "Chat Deleted", description: `"${nameToDelete}" has been deleted.` });
      if (idToDelete === lastSelectedRagConvoId) setLastSelectedRagConvoId(null);
      if (idToDelete === lastSelectedWebConvoId) setLastSelectedWebConvoId(null);
    } catch (error) {
      setListToUpdate(originalConversations);
      toast({ title: "Error", description: "Could not delete chat.", variant: "destructive" });
    } finally {
      setIsDeletingConversation(false);
      setIsDeleteConfirmOpen(false);
      setConversationPendingDeletion(null);
    }
  };
  
  const handleMessagesChange = useCallback(async (
    newOrUpdatedMessagesFromChild: (ChatUIMessage_ChatBot | ChatUIMessage_Web)[],
    mode: 'rag' | 'web',
    instanceConversationId?: string
  ) => {
    const targetConversationId = activeMode === 'split' ? instanceConversationId : selectedConversationId;
    if (!user || !activeClass?.class_id || !targetConversationId) {
      toast({ title: "Error", description: "Cannot save message: No active conversation context.", variant: "destructive" });
      return;
    }

    const getTargetState = (): [ChatMessageApp[], React.Dispatch<React.SetStateAction<ChatMessageApp[]>>] => {
      if (activeMode === 'split') {
        if (mode === 'rag' && targetConversationId === lastSelectedRagConvoId) return [splitViewRagMessages, setSplitViewRagMessages];
        if (mode === 'web' && targetConversationId === lastSelectedWebConvoId) return [splitViewWebMessages, setSplitViewWebMessages];
      }
      return [currentChatMessages, setCurrentChatMessages];
    };
    const [messagesSource, setMessagesFunction] = getTargetState();
    
    const setConversationsFunction = mode === 'rag' ? setRagConversations : setWebConversations;
    const conversationList = mode === 'rag' ? ragConversations : webConversations;

    const newAppMessages = newOrUpdatedMessagesFromChild.map((uiMsg, index) => ({
      id: messagesSource[index]?.id || `temp-${Date.now()}-${index}`,
      role: uiMsg.role,
      content: uiMsg.content,
      createdAt: messagesSource[index]?.createdAt || new Date(),
      conversation_id: targetConversationId,
    }));
    
    setMessagesFunction(newAppMessages);

    const messagesToPersist = newAppMessages.filter(
      (newMsg) => !messagesSource.some(oldMsg => oldMsg.id === newMsg.id && oldMsg.content === newMsg.content)
    );

    if (messagesToPersist.length > 0) {
      const conversationToUpdate = conversationList.find(c => c.id === targetConversationId);
      const firstUserMessage = messagesToPersist.find(m => m.role === 'user');

      if (conversationToUpdate && conversationToUpdate.name.startsWith('New ') && messagesSource.length === 0 && firstUserMessage) {
        try {
          const newTitle = await generateChatTitle(firstUserMessage.content);
          await conversationService.renameConversation(targetConversationId, newTitle, user.id);
          setConversationsFunction(prev => prev.map(c => (c.id === targetConversationId ? { ...c, name: newTitle } : c)));
        } catch (err) {
          console.error("Failed to auto-rename conversation", err);
        }
      }

      let lastSavedMessageDate: Date | null = null;
      for (const newMessage of messagesToPersist) {
        try {
          const savedMessage = await chatMessageService.saveMessage({
            class_id: activeClass.class_id,
            chat_mode: mode,
            role: newMessage.role,
            content: newMessage.content,
            conversation_id: targetConversationId,
          });

          if (savedMessage) {
            lastSavedMessageDate = savedMessage.createdAt;
            setMessagesFunction(current => current.map(m => m.id === newMessage.id ? savedMessage : m));
          }
        } catch (error) {
          toast({ title: "Error", description: `Failed to save a message.`, variant: "destructive" });
        }
      }
      
      if (lastSavedMessageDate && targetConversationId) {
        try {
          const updatedConvo = await conversationService.updateConversationTimestamp(targetConversationId, user.id, lastSavedMessageDate);
          setConversationsFunction(prevConvos => 
            prevConvos.map(convo => convo.id === updatedConvo.id ? updatedConvo : convo)
                     .sort((a,b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
          );
        } catch (error) {
          console.error("Error updating conversation timestamp:", error);
        }
      }
    }
  }, [user, activeClass?.class_id, ragConversations, webConversations, activeMode, selectedConversationId, lastSelectedRagConvoId, lastSelectedWebConvoId, currentChatMessages, splitViewRagMessages, splitViewWebMessages, toast]);


  const commonLoadingIndicator = (text: string) => ( <div className="flex items-center justify-center py-4"> <Loader2 className="h-5 w-5 animate-spin mr-2" /> <span className="text-sm text-muted-foreground">{text}</span> </div> );
  const noConversationSelectedMessage = ( <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-muted-foreground"> <MessageSquarePlus size={48} className="mb-4 opacity-50" /> <h3 className="text-lg font-semibold mb-1">No Chat Selected</h3> <p className="text-sm">Select a chat from the sidebar or create a new one to begin.</p> </div> );
  const noConversationAvailableMessage = (mode: 'rag' | 'web') => (<div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-muted-foreground"><MessageSquarePlus size={48} className="mb-4 opacity-50" /><h3 className="text-lg font-semibold mb-1">No Chats Available</h3><p className="text-sm">{`Create a new ${mode === 'rag' ? 'Class AI' : 'Web AI'} chat to get started.`}</p></div>);

  if (isLoadingPage) { return (<div className="flex justify-center items-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>) }
  
  const activeClassTitleForDisplay = activeClass?.title || "your current class";
  const tabContentWrapperClassName = "bg-card rounded-xl shadow-sm border flex flex-col flex-grow overflow-hidden min-h-0 h-full"; 
  const tabsContentClassName = "flex-grow flex flex-col overflow-hidden data-[state=inactive]:hidden min-h-0 h-full";

  const renderPanelHeader = (panelMode: 'rag' | 'web', isSplitViewContext: boolean = false) => {
    const title = panelMode === 'rag' ? "Class AI" : "Web AI";
    const searchType = panelMode === 'rag' ? 'Database Search' : 'Web Search';
    const Icon = panelMode === 'rag' ? DatabaseIconLucide : Globe;
    
    let conversationNameToDisplay: string | undefined = undefined;
    let subtitle: string;

    const listToSearch = panelMode === 'rag' ? ragConversations : webConversations;
    let convoIdToFind: string | null = null;
    
    if (isSplitViewContext) {
      convoIdToFind = panelMode === 'rag' ? lastSelectedRagConvoId : lastSelectedWebConvoId;
    } else {
      convoIdToFind = selectedConversationId;
    }

    if(convoIdToFind) {
      const currentConvo = listToSearch.find(c => c.id === convoIdToFind);
      if(currentConvo) {
        conversationNameToDisplay = currentConvo.name;
      }
    }
    
    if (conversationNameToDisplay) {
      subtitle = `${searchType} (Chat: ${conversationNameToDisplay})`;
    } else {
      subtitle = panelMode === 'rag' ? `Ask questions about ${activeClassTitleForDisplay}` : "Ask me to search the web";
    }

    return (
        <div className="p-4 border-b border-slate-300 dark:border-zinc-700 flex justify-between items-center flex-shrink-0">
            <div> <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2> <p className="text-sm text-slate-600 dark:text-slate-400 truncate pr-2">{subtitle}</p> </div>
            <Badge variant="outline" className="ml-auto flex-shrink-0 flex items-center gap-1 border-blue-500 text-blue-700 dark:border-blue-400 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30"> <Icon className="h-3 w-3" /> <span className="text-xs">{searchType}</span> </Badge>
        </div>
    );
  };

  return ( 
    <div className="flex flex-col h-[calc(100vh-var(--header-height,30px)-2rem)]">
      {pageError && ( <Alert variant="destructive" className="mt-0 mb-4"> <AlertCircle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription> {pageError} {pageError.includes("No active class") && <Link to="/" className="underline font-semibold">Go Home</Link>} </AlertDescription> </Alert> )}

      {activeClass && (
        <Tabs
          value={activeMode}
          onValueChange={(value) => {
            const newMode = value as ChatMode;
            setActiveMode(newMode);
            if (newMode === 'rag') {
                setSelectedConversationId(lastSelectedRagConvoId);
            } else if (newMode === 'web') {
                setSelectedConversationId(lastSelectedWebConvoId);
            }
            if (newMode !== 'split') {
                setCurrentChatMessages([]);
            }
          }}
          className={cn( "w-full flex flex-col flex-grow min-h-0", "pt-2" )}
        >
          <TabsList className="w-full grid grid-cols-3 mb-4">
             <TabsTrigger value="rag" className="flex-1 gap-2 data-[state=active]:shadow-md"> <Bot className="h-4 w-4" /> Class AI </TabsTrigger>
             <TabsTrigger value="web" className="flex-1 gap-2 data-[state=active]:shadow-md"> <Globe className="h-4 w-4" /> Web AI </TabsTrigger>
             <TabsTrigger value="split" className="flex-1 gap-2 data-[state=active]:shadow-md"> <Split className="h-4 w-4" /> Split View </TabsTrigger>
          </TabsList>

          {(activeMode === 'rag' || activeMode === 'web') && (
            <TabsContent value={activeMode} className={cn(tabsContentClassName, "mt-0")}>
              <div className={tabContentWrapperClassName}>
                {renderPanelHeader(activeMode)}
                <div className="flex flex-1 overflow-hidden"> 
                   <ConversationSidebar conversations={conversations.map(c => ({...c, last_message_at: c.last_message_at.toISOString()}))} selectedConversationId={selectedConversationId} onSelectConversation={handleSelectConversation} onCreateNewConversation={handleCreateNewConversation} onRenameConversation={handleRenameConversation} onAttemptDeleteConversation={handleOpenDeleteDialog} isLoading={isLoadingConversations} className="h-full flex-shrink-0 !border-t-0 !border-l-0 !border-b-0 !rounded-none border-r border-slate-300 dark:border-zinc-700" />
                   <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-card"> 
                      {isLoadingConversations ? commonLoadingIndicator('Loading chats...') : selectedConversationId ? ( activeMode === 'rag' ? ( <ChatBot key={`${selectedConversationId}-rag`} className="!border-0 !shadow-none !rounded-none !p-0 h-full flex flex-col" disableToasts={true} suggestions={ragSuggestions.map(s => s.replace("[topic]", activeClassTitleForDisplay))} knowledgeBase={activeClassTitleForDisplay} openAIConfig={activeClass.openAIConfig} classId={activeClass.class_id} onResponseGenerationStateChange={setIsGeneratingResponse} messages={currentChatMessages.map(mapToChatUIMessage)} onMessagesChange={(newMessages) => handleMessagesChange(newMessages, 'rag')} loadingIndicator={isGeneratingResponse || isLoadingChatMessages ? commonLoadingIndicator("Class AI is thinking...") : undefined} placeholder="Ask about your class materials..." disabled={!selectedConversationId || isGeneratingResponse} /> ) : ( <WebChatBot key={`${selectedConversationId}-web`} className="!border-0 !shadow-none !rounded-none !p-0 h-full flex flex-col" disableToasts={true} suggestions={webSuggestions} placeholder="What would you like to search for?" onResponseGenerationStateChange={setIsGeneratingResponse} messages={currentChatMessages.map(mapToChatUIMessage)} onMessagesChange={(newMessages) => handleMessagesChange(newMessages, 'web')} loadingIndicator={isGeneratingResponse || isLoadingChatMessages ? commonLoadingIndicator("Searching the web...") : undefined} disabled={!selectedConversationId || isGeneratingResponse} /> ) ) : noConversationSelectedMessage}
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
          
          <TabsContent value="split" className={cn(tabsContentClassName.replace("flex flex-col", "flex"), "mt-0")}>
            <ResizablePanelGroup direction="horizontal" className="bg-card rounded-xl shadow-sm border flex-1 flex overflow-hidden min-h-0 h-full">
              <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col overflow-hidden min-h-0">
                {renderPanelHeader('rag', true)} 
                <div className="flex-1 overflow-hidden"> 
                    {isLoadingSplitRagMessages ? commonLoadingIndicator("Loading Class AI chat...") : !lastSelectedRagConvoId ? noConversationAvailableMessage('rag') : ( <ChatBot key={lastSelectedRagConvoId} className="!border-0 !shadow-none !rounded-none !p-0 h-full flex flex-col" messages={splitViewRagMessages.map(mapToChatUIMessage)} onMessagesChange={(newMessages) => handleMessagesChange(newMessages, 'rag', lastSelectedRagConvoId || undefined)} disableToasts={true} suggestions={ragSuggestions.map(s => s.replace("[topic]", activeClassTitleForDisplay))} knowledgeBase={activeClassTitleForDisplay} openAIConfig={activeClass.openAIConfig} classId={activeClass.class_id} onResponseGenerationStateChange={setIsGeneratingSplitRagResponse} loadingIndicator={isGeneratingSplitRagResponse ? commonLoadingIndicator("Class AI is thinking...") : undefined} placeholder="Ask about class materials..." disabled={isGeneratingSplitRagResponse} /> )}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col overflow-hidden min-h-0">
                {renderPanelHeader('web', true)}
                <div className="flex-1 overflow-hidden"> 
                    {isLoadingSplitWebMessages ? commonLoadingIndicator("Loading Web AI chat...") : !lastSelectedWebConvoId ? noConversationAvailableMessage('web') : ( <WebChatBot key={lastSelectedWebConvoId} className="!border-0 !shadow-none !rounded-none !p-0 h-full flex flex-col" disableToasts={true} suggestions={webSuggestions} placeholder="Search the web..." onResponseGenerationStateChange={setIsGeneratingSplitWebResponse} messages={splitViewWebMessages.map(mapToChatUIMessage)} onMessagesChange={(newMessages) => handleMessagesChange(newMessages, 'web', lastSelectedWebConvoId || undefined)} loadingIndicator={isGeneratingSplitWebResponse ? commonLoadingIndicator("Searching the web...") : undefined} disabled={isGeneratingSplitWebResponse} /> )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </TabsContent>
        </Tabs>
      )}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the chat "{conversationPendingDeletion?.name || 'this chat'}" and all its messages.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setIsDeleteConfirmOpen(false)} disabled={isDeletingConversation}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteConversation} disabled={isDeletingConversation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeletingConversation ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>) : ("Delete Chat")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
};

export default SuperTutor;
