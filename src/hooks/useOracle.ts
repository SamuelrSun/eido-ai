// src/hooks/useOracle.ts

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [liveFileCache, setLiveFileCache] = useState<Map<string, FileType>>(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileSubscription = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (fileSubscription.current) {
        supabase.removeChannel(fileSubscription.current);
    }
    if (user) {
        fileSubscription.current = supabase
            .channel(`files-all-updates-for-user-${user.id}`)
            .on<FileType>(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'files', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    const updatedFile = payload.new as FileType;
                    setLiveFileCache(prev => new Map(prev).set(updatedFile.file_id, updatedFile));
                }
            )
            .subscribe();
    }
    return () => {
        if (fileSubscription.current) {
            supabase.removeChannel(fileSubscription.current);
        }
    };
  }, [user]);

  const sourcesToDisplay = useMemo(() => {
    return openSourceTabs.map(source => {
      const liveFile = liveFileCache.get(source.file.file_id);
      return liveFile ? { ...source, file: liveFile } : source;
    });
  }, [openSourceTabs, liveFileCache]);

  const selectedFile = useMemo(() => {
    return sourcesToDisplay.find(s => s.file.file_id === selectedSourceId)?.file || null;
  }, [selectedSourceId, sourcesToDisplay]);

  useEffect(() => {
    const fetchUserAndClasses = async () => {
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
        } catch (error) {
            toast({ title: "Error", description: "Could not load initial page data.", variant: "destructive" });
        } finally {
            setPageLoading(false);
            if (loader) loader.complete();
        }
    };
    fetchUserAndClasses();
  }, [toast, loader]);
  
  const handleMessageSelect = useCallback((message: ChatMessageApp) => {
      setSelectedMessageId(message.id);
      setSelectedSourceId(null);
      if (message.role === 'assistant' && message.sources && message.sources.length > 0) {
          setOpenSourceTabs(message.sources);
      } else {
          setOpenSourceTabs([]);
      }
  }, []);

  const fetchConversations = useCallback(async () => {
      if (!user) return;
      setIsLoadingConversations(true);
      try {
          const convos = await conversationService.fetchConversations(user.id, selectedClassId || undefined);
          setConversations(convos);
          if (convos.length > 0 && !convos.some(c => c.id === selectedConversationId)) {
              setSelectedConversationId(convos[0].id);
          }
      } catch (error) { toast({ title: "Error", description: "Could not load chat history.", variant: "destructive" }); } 
      finally { setIsLoadingConversations(false); }
  }, [user, toast, selectedClassId, selectedConversationId]);

  useEffect(() => { fetchConversations(); }, [user, fetchConversations]);

  const fetchMessages = useCallback(async () => {
      if (!selectedConversationId) {
          setMessages([]); setSelectedMessageId(null); setOpenSourceTabs([]);
          return;
      }
      setIsLoadingMessages(true);
      try {
          const fetchedMessages = await chatMessageService.fetchMessagesByConversation(selectedConversationId);
          setMessages(fetchedMessages);
          const lastMessage = fetchedMessages[fetchedMessages.length - 1];
          if (lastMessage) { handleMessageSelect(lastMessage); } 
          else { setSelectedMessageId(null); setOpenSourceTabs([]); }
      } catch (error) { toast({ title: "Error", description: "Could not load messages for this chat.", variant: "destructive" }); } 
      finally { setIsLoadingMessages(false); }
  }, [selectedConversationId, toast, handleMessageSelect]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  
  useEffect(() => {
    if (!isChatLoading) { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }
  }, [messages, isChatLoading]);

  const handleCitationClick = useCallback((messageId: string, sourceNumber: number) => {
    setSelectedMessageId(messageId);
    
    const message = messages.find(m => m.id === messageId);
    if (!message?.sources) return;

    const targetSource = message.sources.find(s => s.number === sourceNumber);
    if (targetSource) {
        setSelectedSourceId(targetSource.file.file_id);
    }
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if ((input.trim() === "" && attachedFiles.length === 0) || isChatLoading || !user) return;
    
    let activeConversationId = selectedConversationId;
    if (!activeConversationId) {
      const newConvo = await conversationService.createConversation({ name: "New Chat", class_id: selectedClassId, chatbot_type: 'oracle' }, user.id);
      setConversations(prev => [newConvo, ...prev]);
      activeConversationId = newConvo.id;
      setSelectedConversationId(newConvo.id);
      setMessages([]);
    }

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
            conversation_id: activeConversationId,
            role: 'user',
            content: currentInput,
            chat_mode: 'rag',
            class_id: selectedClassId,
            attached_files: currentFiles.map(f => ({ name: f.name, type: f.type }))
        });

        const { data: aiData, error: aiError } = await supabase.functions.invoke('oracle-chat', {
            body: { message: currentInput, class_id: selectedClassId, files: currentFiles }
        });
        if (aiError || aiData.error) throw new Error(aiError?.message || aiData.error);
        
        const savedAiMessage = await chatMessageService.saveMessage({
            conversation_id: activeConversationId,
            role: 'assistant',
            content: aiData.response,
            chat_mode: 'rag',
            class_id: selectedClassId,
            sources: aiData.sources
        });
        
        setMessages(prev => [...prev.filter(m => m.id !== tempUserMessage.id), savedUserMessage, savedAiMessage]);
        handleMessageSelect(savedAiMessage);

    } catch (error) {
        toast({ title: "Error sending message", description: (error as Error).message, variant: "destructive" });
        setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
        setIsChatLoading(false);
    }
  }, [input, attachedFiles, isChatLoading, user, selectedConversationId, selectedClassId, messages, toast, handleMessageSelect]);

  const handleNewChat = useCallback(async () => {
      if (!user) return;
      const newConvo = await conversationService.createConversation({ name: 'New Chat', class_id: selectedClassId, chatbot_type: 'oracle' }, user.id);
      setConversations(prev => [newConvo, ...prev]);
      setSelectedConversationId(newConvo.id);
  }, [user, selectedClassId]);

  const handleRenameConversation = useCallback(async (id: string, newName: string) => {
      if (!user) return;
      await conversationService.renameConversation(id, newName, user.id);
      fetchConversations();
  }, [user, fetchConversations]);

  const handleDeleteConversation = (convo: AppConversation) => setConversationToDelete(convo);

  const confirmDelete = useCallback(async () => {
      if (!conversationToDelete || !user) return;
      setIsDeleting(true);
      await conversationService.deleteConversation(conversationToDelete.id, user.id);
      toast({ title: "Chat Deleted" });
      if (selectedConversationId === conversationToDelete.id) {
          setSelectedConversationId(null);
      }
      setConversationToDelete(null);
      fetchConversations();
      setIsDeleting(false);
  }, [conversationToDelete, user, selectedConversationId, fetchConversations, toast]);

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
  const handleSourceSelect = (id: string) => setSelectedSourceId(prev => (prev === id ? null : id));
  
  // MODIFICATION: Add the new handler.
  const handleClearSourceSelection = () => setSelectedSourceId(null);

  return {
    input, setInput, isChatLoading, isPageLoading, user, userProfile,
    conversations, selectedConversationId, setSelectedConversationId,
    messages, classes, selectedClassId, setSelectedClassId,
    isLoadingConversations, isLoadingMessages, selectedMessageId,
    attachedFiles, setAttachedFiles, openSourceTabs, isHistoryCollapsed, setIsHistoryCollapsed,
    selectedSourceId, sourcesToDisplay, selectedFile,
    messagesEndRef, fileInputRef,
    handleSendMessage, handleNewChat, handleRenameConversation,
    handleDeleteConversation, handleMessageSelect, handleCitationClick,
    handleSourceSelect, handleClearSourceSelection, // MODIFICATION: Export the new handler.
    handleFileSelect, handlePaste, handleRemoveFile,
    confirmDelete, conversationToDelete, setConversationToDelete, isDeleting
  };
};