// src/hooks/useOracle.ts

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, RealtimeChannel } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { usePageLoader } from '@/context/LoaderContext';
import { AppConversation, conversationService } from '@/services/conversationService';
import { chatMessageService, ChatMessageApp, ActiveSource } from '@/services/chatMessageService';
import { ClassConfig, classOpenAIConfigService } from '@/services/classOpenAIConfig';
import { AttachedFile } from '@/components/chat/AttachedFilePill';
import { FileType } from '@/features/files/types';
import { OracleState, ProfileData } from '@/types/oracle';

export const useOracle = (): OracleState => {
  const { loader } = usePageLoader();
  const { toast } = useToast();
  const location = useLocation();
  const [input, setInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isPageLoading, setPageLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);
  const [conversations, setConversations] = useState<AppConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageApp[]>([]);
  const [classes, setClasses] = useState<ClassConfig[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<AppConversation | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [openSourceTabs, setOpenSourceTabs] = useState<ActiveSource[]>([]);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [selectedSourceNumber, setSelectedSourceNumber] = useState<number | null>(null);
  const [liveFileCache, setLiveFileCache] = useState<Map<string, FileType>>(new Map());
  const [temporaryChatId, setTemporaryChatId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileSubscription = useRef<RealtimeChannel | null>(null);

  const sourcesToDisplay = useMemo(() => openSourceTabs.map(source => liveFileCache.get(source.file.file_id) ? { ...source, file: liveFileCache.get(source.file.file_id)! } : source), [openSourceTabs, liveFileCache]);
  const selectedFile = useMemo(() => sourcesToDisplay.find(s => s.number === selectedSourceNumber)?.file || null, [selectedSourceNumber, sourcesToDisplay]);

  const selectConversation = useCallback((id: string | null) => {
    setSelectedConversationId(id);
    if (id) {
      sessionStorage.setItem('oracleActiveChatId', id);
    } else {
      sessionStorage.removeItem('oracleActiveChatId');
    }
  }, []);

  const handleMessageSelect = useCallback((message: ChatMessageApp | null) => {
    setSelectedMessageId(message?.id || null);
    setSelectedSourceNumber(null);
    if (message?.role === 'assistant' && message.sources?.length) {
        setOpenSourceTabs(message.sources);
    } else {
        setOpenSourceTabs([]);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
      if (!selectedConversationId) {
          setMessages([]); setSelectedMessageId(null); setOpenSourceTabs([]); return;
      }
      setIsLoadingMessages(true);
      try {
          const fetchedMessages = await chatMessageService.fetchMessagesByConversation(selectedConversationId);
          setMessages(fetchedMessages);
          handleMessageSelect(fetchedMessages[fetchedMessages.length - 1] || null);
      } catch (error) { toast({ title: "Error", description: "Could not load messages for this chat.", variant: "destructive" }); } 
      finally { setIsLoadingMessages(false); }
  }, [selectedConversationId, toast, handleMessageSelect]);

  const handleCitationClick = useCallback((messageId: string, sourceNumber: number) => {
    setSelectedMessageId(messageId);
    setSelectedSourceNumber(sourceNumber);
  }, []);
  
  const handleClassChange = useCallback((newClassId: string | null) => {
    setSelectedClassId(newClassId);
    selectConversation(null);
    if (newClassId) {
        const selectedClass = classes.find(c => c.class_id === newClassId);
        if (selectedClass) sessionStorage.setItem('activeClass', JSON.stringify(selectedClass));
    } else {
        sessionStorage.removeItem('activeClass');
    }
  }, [classes, selectConversation]);

  const handleRenameConversation = useCallback(async (id: string, newName: string) => {
    if (!user) return;
    setConversations(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
    try {
        await conversationService.renameConversation(id, newName, user.id);
    } catch (error) {
        console.error("Failed to rename conversation in DB:", error);
        toast({ title: "Error", description: "Could not save new chat title.", variant: "destructive" });
    }
  }, [user, toast]);

  const handleSendMessage = useCallback(async () => {
    if ((input.trim() === "" && attachedFiles.length === 0) || isChatLoading || !user) return;
    
    const activeConversationId = selectedConversationId;
    if (!activeConversationId) {
        toast({ title: "Error", description: "No active chat selected.", variant: "destructive" });
        return;
    }

    if (activeConversationId === temporaryChatId) {
        setTemporaryChatId(null);
    }

    const isFirstMessage = messages.length === 0;

    const currentInput = input;
    const currentFiles = [...attachedFiles];
    setInput("");
    setAttachedFiles([]);
    setIsChatLoading(true);

    const tempUserMessage: ChatMessageApp = {
        id: `temp-${Date.now()}`, role: 'user', content: currentInput,
        createdAt: new Date(), conversation_id: activeConversationId,
        attached_files: currentFiles.map(f => ({ name: f.name, type: f.type })),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
        const savedUserMessage = await chatMessageService.saveMessage({
            conversation_id: activeConversationId, role: 'user', content: currentInput, chat_mode: 'rag',
            class_id: selectedClassId, attached_files: currentFiles.map(f => ({ name: f.name, type: f.type }))
        });

        if (isFirstMessage) {
            try {
                const titleQuery = currentInput || `Chat about ${currentFiles.map(f => f.name).join(', ')}`;
                const { data } = await supabase.functions.invoke('generate-title', { body: { query: titleQuery } });
                if (data?.title) await handleRenameConversation(activeConversationId, data.title);
            } catch (titleError) { console.error("Could not auto-generate title:", titleError); }
        }

        const { data: aiData, error: aiError } = await supabase.functions.invoke('oracle-chat', {
            body: { message: currentInput, class_id: selectedClassId, files: currentFiles }
        });
        if (aiError || aiData.error) throw new Error(aiError?.message || aiData.error);
        
        const savedAiMessage = await chatMessageService.saveMessage({
            conversation_id: activeConversationId, role: 'assistant', content: aiData.response, chat_mode: 'rag',
            class_id: selectedClassId, sources: aiData.sources
        });
        
        setMessages(prev => [...prev.filter(m => m.id !== tempUserMessage.id), savedUserMessage, savedAiMessage]);
        handleMessageSelect(savedAiMessage);

    } catch (error) {
        toast({ title: "Error sending message", description: (error as Error).message, variant: "destructive" });
        setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
        setIsChatLoading(false);
    }
  }, [input, attachedFiles, isChatLoading, user, selectedConversationId, selectedClassId, messages.length, toast, handleMessageSelect, handleRenameConversation, temporaryChatId]);
  
  const handleNewChat = useCallback(async () => {
      if (!user) return;
      const newConvo = await conversationService.createConversation({ name: 'New Chat', class_id: selectedClassId, chatbot_type: 'oracle' }, user.id);
      setConversations(prev => [newConvo, ...prev]);
      selectConversation(newConvo.id);
      setTemporaryChatId(newConvo.id);
  }, [user, selectedClassId, selectConversation]);

  const handleDeleteConversation = (convo: AppConversation) => setConversationToDelete(convo);

  const confirmDelete = useCallback(async () => {
      if (!conversationToDelete || !user) return;
      setIsDeleting(true);
      await conversationService.deleteConversation(conversationToDelete.id, user.id);
      toast({ title: "Chat Deleted" });
      if (selectedConversationId === conversationToDelete.id) {
          selectConversation(null);
      }
      setConversationToDelete(null);
      setConversations(prev => prev.filter(c => c.id !== conversationToDelete.id));
      setIsDeleting(false);
  }, [conversationToDelete, user, selectedConversationId, selectConversation, toast]);

  const processFiles = useCallback((files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach(file => {
          const reader = new FileReader();
          reader.onload = (e) => {
              const base64Content = (e.target?.result as string).split(',')[1];
              if (base64Content) {
                  setAttachedFiles(prev => [...prev, { id: `${file.name}-${Date.now()}`, name: file.name, type: file.type, content: base64Content }]);
              }
          };
          reader.readAsDataURL(file);
      });
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => processFiles(e.target.files), [processFiles]);
  const handlePaste = useCallback((e: React.ClipboardEvent) => processFiles(e.clipboardData.files), [processFiles]);
  const handleRemoveFile = (fileId: string) => setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  const handleSourceSelect = (sourceNumber: number) => setSelectedSourceNumber(prev => (prev === sourceNumber ? null : sourceNumber));
  const handleClearSourceSelection = () => setSelectedSourceNumber(null);

  useEffect(() => {
    const fetchInitialData = async () => {
        setPageLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user;
            setUser(currentUser || null);
            if (currentUser) {
                const { data: profileData } = await supabase.from('profiles').select('full_name, avatar_url').eq('user_id', currentUser.id).single();
                setUserProfile(profileData);
                const fetchedClasses = await classOpenAIConfigService.getAllClasses();
                setClasses(fetchedClasses);
                const activeClassDataString = sessionStorage.getItem('activeClass');
                if (activeClassDataString) {
                  const parsedClass = JSON.parse(activeClassDataString);
                    if (fetchedClasses.some(c => c.class_id === parsedClass.class_id)) {
                        setSelectedClassId(parsedClass.class_id);
                    }
                }
            }
        } catch (error) { toast({ title: "Error", description: "Could not load initial page data.", variant: "destructive" }); }
        finally { setPageLoading(false); if (loader) loader.complete(); }
    };
    fetchInitialData();
  }, [toast, loader]);
  
  useEffect(() => {
    if (!user) return;
    const fetchAndSelectConversations = async () => {
        setIsLoadingConversations(true);
        try {
            const cameFromNav = location.state?.fromNavigation;
            const lastOpenChatId = sessionStorage.getItem('oracleActiveChatId');
            const fetchedConversations = await conversationService.fetchConversations(user.id, selectedClassId || undefined);
            
            if (cameFromNav) {
                await handleNewChat();
            } else if (lastOpenChatId && fetchedConversations.some(c => c.id === lastOpenChatId)) {
                setConversations(fetchedConversations);
                selectConversation(lastOpenChatId);
            } else if (fetchedConversations.length > 0) {
                setConversations(fetchedConversations);
                selectConversation(fetchedConversations[0].id);
            } else {
                await handleNewChat();
            }
        } catch (error) { toast({ title: "Error", description: "Could not load chat history.", variant: "destructive" }); }
        finally { 
            setIsLoadingConversations(false); 
            if (location.state?.fromNavigation) {
                window.history.replaceState({}, document.title);
            }
        }
    };
    fetchAndSelectConversations();
  }, [user, selectedClassId, location.state]);

  useEffect(() => { fetchMessages(); }, [selectedConversationId]);

  useEffect(() => {
    if (!isChatLoading) { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }
  }, [messages, isChatLoading]);

  useEffect(() => {
    const tempId = temporaryChatId;
    return () => {
        if (tempId && user) {
            const checkAndDelete = async () => {
                try {
                    const { count } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('conversation_id', tempId);
                    if (count === 0) {
                        await conversationService.deleteConversation(tempId, user.id);
                    }
                } catch (e) { console.error("Failed to clean up temporary chat:", e); }
            };
            checkAndDelete();
        }
    };
  }, [temporaryChatId, user]);

  return {
    input, setInput, isChatLoading, isPageLoading, user, userProfile,
    conversations, selectedConversationId, selectConversation,
    messages, classes, selectedClassId, handleClassChange,
    isLoadingConversations, isLoadingMessages, selectedMessageId,
    attachedFiles, setAttachedFiles, openSourceTabs, isHistoryCollapsed, setIsHistoryCollapsed,
    selectedSourceNumber, sourcesToDisplay, selectedFile,
    messagesEndRef, fileInputRef,
    handleSendMessage, handleNewChat, handleRenameConversation,
    handleDeleteConversation, handleMessageSelect, handleCitationClick,
    handleSourceSelect, handleClearSourceSelection,
    handleFileSelect, handlePaste, handleRemoveFile,
    confirmDelete, conversationToDelete, setConversationToDelete, isDeleting
  };
};