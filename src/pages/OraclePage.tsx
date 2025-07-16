// src/pages/OraclePage.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlusCircle, PanelLeft, PanelRight, MessageSquarePlus, BookCheck, Files, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HistorySidebar } from '@/components/oracle/HistorySidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { AppConversation, conversationService } from '@/services/conversationService';
import { chatMessageService, ChatMessageApp, ActiveSource } from '@/services/chatMessageService';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ClassConfig, classOpenAIConfigService } from '@/services/classOpenAIConfig';
import { AttachedFile, AttachedFilePill } from '@/components/chat/AttachedFilePill';
import { usePageLoader } from '@/context/LoaderContext';
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import { fileService } from '@/services/fileService';
import { FileType } from '@/features/files/types';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
}

const placeholderQuotes = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    "Excepteur sint occaecat cupidatat non proident."
];

const OraclePage = () => {
    const { loader } = usePageLoader();
    const [input, setInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isPageLoading, setPageLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
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
    const [activeSourceTab, setActiveSourceTab] = useState<string | undefined>();
    const [openSourceTabs, setOpenSourceTabs] = useState<ActiveSource[]>([]);
    const messageRefs = useRef(new Map<string, HTMLDivElement | null>());
    const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

    const [exampleSources, setExampleSources] = useState<FileType[]>([]);
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
    const sourceTextRefs = useRef(new Map());
    const sourceThumbnailRefs = useRef(new Map());
    const [numPages, setNumPages] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [minScale, setMinScale] = useState(1.0);
    const pdfPreviewRef = useRef<HTMLDivElement>(null);
    const pageRefs = useRef(new Map<number, HTMLDivElement>());
    
    useEffect(() => {
        const fetchExampleFiles = async () => {
            if (user) {
                try {
                    const allFiles = await fileService.getAllFilesWithClass();
                    setExampleSources(allFiles.slice(0, 4) as FileType[]);
                } catch (error) {
                    console.error("Failed to fetch example files for sources panel", error);
                }
            }
        };
        fetchExampleFiles();
    }, [user]);

    useEffect(() => {
        if (!isPageLoading && loader) {
            loader.complete();
        }
    }, [isPageLoading, loader]);

    const handleRemoveFile = (fileId: string) => {
        setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const processFiles = (files: FileList | null) => {
        if (!files) return;
        const newFiles: AttachedFile[] = [];
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Content = (e.target?.result as string).split(',')[1];
                if (base64Content) {
                    newFiles.push({
                        id: `${file.name}-${Date.now()}`,
                        name: file.name,
                        type: file.type,
                        content: base64Content
                    });
                    setAttachedFiles(prev => [...prev, ...newFiles]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(event.target.files);
    };
    
    const handlePaste = (event: React.ClipboardEvent) => {
        processFiles(event.clipboardData.files);
    };

    const handleMessageSelect = useCallback((message: ChatMessageApp) => {
        if (message.role === 'assistant') {
            setSelectedMessageId(message.id);
            setSelectedSourceId(null);
            if (message.sources && message.sources.length > 0) {
                setOpenSourceTabs(message.sources);
                setActiveSourceTab(message.sources[0].file.file_id);
            } else {
                setOpenSourceTabs([]);
                setActiveSourceTab(undefined);
            }
        } else {
            setSelectedMessageId(null);
            setOpenSourceTabs([]);
            setActiveSourceTab(undefined);
        }
    }, []);

    const handleCitationClick = (sourceNumber: number) => {
        const message = messages.find(m => m.id === selectedMessageId);
        if (!message || !message.sources) return;
        const targetSource = message.sources.find(s => s.number === sourceNumber);
        if (targetSource) {
            setSelectedSourceId(targetSource.file.file_id);
            if (!openSourceTabs.some(s => s.file.file_id === targetSource.file.file_id)) {
                setOpenSourceTabs(prev => [...prev, targetSource]);
            }
            setActiveSourceTab(targetSource.file.file_id);
        }
    };

    const handleCloseSourceTab = useCallback((fileIdToClose: string) => {
        setOpenSourceTabs(prevTabs => {
            const newTabs = prevTabs.filter(tab => tab.file.file_id !== fileIdToClose);
            if (activeSourceTab === fileIdToClose) {
                setActiveSourceTab(newTabs.length > 0 ? newTabs[0].file.file_id : undefined);
            }
            return newTabs;
        });
    }, [activeSourceTab]);

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
                        const parsedClass: { class_id: string; class_name: string; } = JSON.parse(activeClassDataString);
                        if (fetchedClasses.some(c => c.class_id === parsedClass.class_id)) {
                            setSelectedClassId(parsedClass.class_id);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching initial page data:", error);
                toast({ title: "Error", description: "Could not load initial page data.", variant: "destructive" });
            } finally {
                setPageLoading(false);
            }
        };
        fetchUserAndClasses();
    }, [toast]);

    const fetchConversations = useCallback(async () => {
        if (!user) return;
        setIsLoadingConversations(true);
        try {
            const convos = await conversationService.fetchConversations(user.id, selectedClassId || undefined);
            setConversations(convos);
            if (convos.length > 0 && !convos.some(c => c.id === selectedConversationId)) {
                setSelectedConversationId(convos[0].id);
            }
        } catch (error: unknown) {
            toast({ title: "Error", description: (error instanceof Error) ? error.message : "Could not load chat history.", variant: "destructive" });
        } finally {
             setIsLoadingConversations(false);
        }
    }, [user, toast, selectedClassId, selectedConversationId]);

    useEffect(() => { fetchConversations(); }, [user, fetchConversations]);

    const selectedMessage = messages.find(m => m.id === selectedMessageId);

    useEffect(() => {
        if (!selectedConversationId) {
            setMessages([]);
            setSelectedMessageId(null);
            setOpenSourceTabs([]);
            setActiveSourceTab(undefined);
            return;
        }
        const fetchMessages = async () => {
             setIsLoadingMessages(true);
            try {
                const fetchedMessages = await chatMessageService.fetchMessagesByConversation(selectedConversationId);
                setMessages(fetchedMessages);
                const lastAssistantMessage = fetchedMessages.filter(m => m.role === 'assistant').pop();
                if (lastAssistantMessage) {
                    handleMessageSelect(lastAssistantMessage);
                } else {
                    setSelectedMessageId(null);
                    setOpenSourceTabs([]);
                    setActiveSourceTab(undefined);
                }
             } catch (error: unknown) {
                toast({ title: "Error", description: (error instanceof Error) ? error.message : "Could not load messages for this chat.", variant: "destructive" });
            } finally {
                setIsLoadingMessages(false);
            }
        };
        fetchMessages();
    }, [selectedConversationId, toast, handleMessageSelect]);
    
    useEffect(() => {
        if (!isChatLoading) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isChatLoading]);

    const handleNewChat = async () => {
        if (!user) return;
        try {
            const newConvo = await conversationService.createConversation({ name: 'New Chat', class_id: selectedClassId, chat_mode: 'rag', chatbot_type: 'oracle' }, user.id);
            setConversations(prev => [newConvo, ...prev]);
            setSelectedConversationId(newConvo.id);
            setMessages([]);
            setSelectedMessageId(null);
            setOpenSourceTabs([]);
            setActiveSourceTab(undefined);
        } catch (error) {
            toast({ title: "Error", description: "Could not create a new chat." });
        }
    };

    const handleSendMessage = async () => {
        if ((input.trim() === "" && attachedFiles.length === 0) || isChatLoading || !user) return;
        let activeConversationId = selectedConversationId;
        let isNewConversation = false;

        if (!activeConversationId) {
            isNewConversation = true;
            try {
                const newConvo = await conversationService.createConversation({ name: "New Chat", class_id: selectedClassId, chat_mode: 'rag', chatbot_type: 'oracle' }, user.id);
                setConversations(prev => [newConvo, ...prev]);
                activeConversationId = newConvo.id;
                setSelectedConversationId(newConvo.id);
                setMessages([]);
            } catch (error: unknown) {
                toast({ title: "Error", description: (error instanceof Error) ? error.message : "Could not start a new chat.", variant: "destructive" });
                return;
            }
        }

        const currentInput = input;
        const currentFiles = [...attachedFiles];
        const displayFiles = currentFiles.map(f => ({ name: f.name, type: f.type }));
        setInput("");
        setAttachedFiles([]);
        setIsChatLoading(true);
        const tempUserMessage: ChatMessageApp = {
            id: `temp-${Date.now()}`, role: 'user', content: currentInput,
            createdAt: new Date(), conversation_id: activeConversationId as string,
            attached_files: displayFiles,
        };
        setMessages(prev => [...prev, tempUserMessage]);
        
        try {
            const savedUserMessage = await chatMessageService.saveMessage({
                conversation_id: activeConversationId as string,
                role: 'user',
                content: currentInput,
                chat_mode: 'rag',
                class_id: selectedClassId,
                attached_files: displayFiles
            });
            if (isNewConversation) {
                try {
                    const titleQuery = currentInput || `Chat about ${currentFiles.map(f => f.name).join(', ')}`;
                    const { data } = await supabase.functions.invoke('generate-title', { body: { query: titleQuery } });
                    if (data && data.title) {
                        await handleRenameConversation(activeConversationId as string, data.title);
                    }
                } catch (titleError) { console.error("Could not auto-generate title:", titleError); }
            }

            const payload = {
                message: currentInput,
                history: messages.map(m => ({role: m.role, content: m.content})),
                class_id: selectedClassId,
                files: currentFiles.map(f => ({ name: f.name, type: f.type }))
            };
            const { data: aiData, error: aiError } = await supabase.functions.invoke('oracle-chat', { body: payload });
            if (aiError || (aiData && aiData.error)) {
                    throw new Error(aiError?.message || aiData.error || "Invalid response from AI service.");
            }
            
            const responseText = aiData.response;
            const allPotentialSources = aiData.sources || [];
            const citationRegex = /\[SOURCE (\d+)]/g;
            const citedSourceNumbers = new Set(
                Array.from(responseText.matchAll(citationRegex), match => parseInt(match[1], 10))
            );
            const finalCitedSources = allPotentialSources.filter((source: any) => 
                citedSourceNumbers.has(source.number)
            );
            const numberMap = new Map(finalCitedSources.map((source: any, index: number) => [source.number, index + 1]));
            const renumberedContent = responseText.replace(citationRegex, (match: any, oldNumStr: string) => {
                const oldNum = parseInt(oldNumStr, 10);
                const newNum = numberMap.get(oldNum);
                return newNum ? `[SOURCE ${newNum}]` : match;
            });
            const renumberedAndFilteredSources = finalCitedSources.map((source: any) => ({
                ...source,
                number: numberMap.get(source.number)!
            }));
            const savedAiMessage = await chatMessageService.saveMessage({
                conversation_id: activeConversationId as string,
                role: 'assistant',
                content: renumberedContent,
                chat_mode: 'rag',
                class_id: selectedClassId,
                sources: renumberedAndFilteredSources,
            });
            setMessages(prev => [...prev.filter(m => m.id !== tempUserMessage.id), savedUserMessage, savedAiMessage]);
            handleMessageSelect(savedAiMessage);
        } catch (error: unknown) {
            toast({ title: "Error", description: error instanceof Error ? `Failed to get a response: ${error.message}` : "An unknown error occurred.", variant: "destructive" });
            setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleRenameConversation = async (id: string, newName: string) => {
        if (!user) return;
        try {
            await conversationService.renameConversation(id, newName, user.id);
            fetchConversations();
        } catch (error) {
            console.error("Error renaming conversation", error);
            toast({ title: "Error", description: "Could not rename conversation." });
        }
    };

    const handleDeleteConversation = (convo: AppConversation) => { setConversationToDelete(convo); };

    const confirmDelete = async () => {
        if (!conversationToDelete || !user) return;
        setIsDeleting(true);
        try {
            await conversationService.deleteConversation(conversationToDelete.id, user.id);
            toast({ title: "Chat Deleted", description: `"${conversationToDelete.name}" has been removed.` });
            if (selectedConversationId === conversationToDelete.id) {
                setSelectedConversationId(null);
                setMessages([]);
                setSelectedMessageId(null);
                setOpenSourceTabs([]);
                setActiveSourceTab(undefined);
            }
            setConversationToDelete(null);
            fetchConversations();
        } catch (error) {
            console.error("Error deleting conversation", error);
            toast({ title: "Error", description: "Could not delete conversation." });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };
    const getUserName = () => userProfile?.full_name || user?.email?.split('@')[0] || "You";
    
    const handleSourceSelect = (id: string) => {
        setSelectedSourceId(prevId => (prevId === id ? null : id));
    };
    
    const sourcesToDisplay = useMemo(() => {
        if (openSourceTabs.length > 0) {
            return openSourceTabs;
        }
        return exampleSources.map((file, index) => ({
            number: index + 1,
            file: file,
            pageNumber: file.page_count || 1,
            content: placeholderQuotes[index % placeholderQuotes.length],
            file_id: file.file_id,
        }));
    }, [openSourceTabs, exampleSources]);

    const selectedFile = useMemo(() => {
        return sourcesToDisplay.find(s => s.file.file_id === selectedSourceId)?.file || null;
    }, [selectedSourceId, sourcesToDisplay]);

    const onDocumentLoadSuccess = useCallback(async (pdf: any) => {
        setNumPages(pdf.numPages);
        const source = sourcesToDisplay.find(s => s.file.file_id === selectedFile?.file_id);
        setCurrentPage(source?.pageNumber || 1);

        if (pdfPreviewRef.current) {
            try {
                const page = await pdf.getPage(1);
                const containerWidth = pdfPreviewRef.current.clientWidth;
                const pageWidth = page.view[2];
                if (containerWidth > 0 && pageWidth > 0) {
                    const calculatedMinScale = (containerWidth / pageWidth) * 0.98; // 98% to ensure it fits
                    setMinScale(calculatedMinScale);
                    setScale(calculatedMinScale);
                }
            } catch(e) {
                console.error("Error calculating initial scale:", e);
            }
        }
    }, [sourcesToDisplay, selectedFile]);

    const goToPage = (pageNumber: number) => {
        const pageRef = pageRefs.current.get(pageNumber);
        if (pageRef) {
            pageRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setCurrentPage(pageNumber);
    };

    const goToPrevPage = () => {
        const newPage = Math.max(currentPage - 1, 1);
        goToPage(newPage);
    };

    const goToNextPage = () => {
        const newPage = Math.min(currentPage + 1, numPages || 1);
        goToPage(newPage);
    };

    const handleZoomIn = () => setScale(s => Math.min(s * 1.2, 3.0));
    const handleZoomOut = () => setScale(s => Math.max(s / 1.2, minScale));

    useEffect(() => {
        if (selectedFile) {
            const source = sourcesToDisplay.find(s => s.file.file_id === selectedFile.file_id);
            const targetPage = source?.pageNumber || 1;
            setCurrentPage(targetPage);
            setTimeout(() => goToPage(targetPage), 100);
        }
    }, [selectedFile, sourcesToDisplay]);
    
    // FIX: Re-implement arrow key navigation for sources
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === 'TEXTAREA') return;
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            if (selectedSourceId === null) return;

            const currentIndex = sourcesToDisplay.findIndex(s => s.file.file_id === selectedSourceId);
            if (currentIndex === -1) return;

            e.preventDefault();

            let nextIndex;
            if (e.key === 'ArrowRight') {
                nextIndex = (currentIndex + 1) % sourcesToDisplay.length;
            } else { // ArrowLeft
                nextIndex = (currentIndex - 1 + sourcesToDisplay.length) % sourcesToDisplay.length;
            }
            setSelectedSourceId(sourcesToDisplay[nextIndex].file.file_id);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSourceId, sourcesToDisplay]);
    
    // FIX: Implement robust page tracking on scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries.filter(entry => entry.isIntersecting);
                if (visibleEntries.length > 0) {
                    const pageNumbers = visibleEntries.map(entry => parseInt(entry.target.getAttribute('data-page-number') || '0', 10));
                    setCurrentPage(Math.min(...pageNumbers));
                }
            },
            { root: pdfPreviewRef.current, threshold: 0.1 }
        );

        const currentRefs = pageRefs.current;
        currentRefs.forEach(pageEl => {
            if (pageEl) observer.observe(pageEl);
        });

        return () => {
            currentRefs.forEach(pageEl => {
                if (pageEl) observer.unobserve(pageEl);
            });
        };
    }, [numPages, scale]); // Rerun when pages are re-rendered

    return (
        <>
            <style>{`
            `}</style>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/png, image/jpeg, application/pdf" />
            <MainAppLayout pageTitle="Oracle | Eido AI">
                <TooltipProvider delayDuration={100}>
                    <div className="flex-1 w-full bg-mushroom-100 flex flex-col relative" onPaste={handlePaste}>
                        <main className="absolute inset-0 flex flex-row gap-3 px-3 pb-3">
                            <div className="w-[60%] flex flex-row h-full">
                                <div className={cn(
                                    "h-full bg-stone-50 overflow-hidden transition-all duration-300 ease-in-out rounded-l-lg",
                                    isHistoryCollapsed ? "w-0" : "w-1/4 min-w-[220px] border-r border-stone-200"
                                )}>
                                    <div className="flex flex-col h-full">
                                        <header className="flex items-center justify-between gap-x-2 px-2 h-14 flex-shrink-0">
                                            <div></div>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={handleNewChat}>
                                                        <MessageSquarePlus className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>New Chat</p></TooltipContent>
                                            </Tooltip>
                                        </header>
                                        <div className="flex-1 min-h-0">
                                            <HistorySidebar conversations={conversations} selectedConversationId={selectedConversationId} onSelectConversation={setSelectedConversationId} onRenameConversation={handleRenameConversation} onDeleteConversation={handleDeleteConversation} isLoading={isLoadingConversations} />
                                        </div>
                                    </div>
                                </div>

                                <div className={cn(
                                    "flex-1 flex flex-col h-full bg-white overflow-hidden border border-marble-400",
                                    isHistoryCollapsed ? "rounded-lg" : "rounded-r-lg"
                                )}>
                                    <header className="flex items-center justify-between gap-x-2 border-b border-marble-400 px-4 h-14 flex-shrink-0">
                                        <div className="flex items-center gap-4">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}>
                                                        {isHistoryCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>Toggle History</p></TooltipContent>
                                            </Tooltip>
                                            <Select onValueChange={(value) => { setSelectedClassId(value === 'all' ? null : value); setSelectedConversationId(null); setMessages([]); }} value={selectedClassId || "all"}>
                                                <SelectTrigger className="w-full sm:w-[220px] h-8 text-xs">
                                                    <SelectValue placeholder="Select a Class..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Documents</SelectItem>
                                                    {classes.map(cls => (<SelectItem key={cls.class_id} value={cls.class_id}>{cls.class_name}</SelectItem>))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </header>
                                    <div className="flex-1 flex flex-col p-4 gap-4 min-h-0">
                                        <ScrollArea className="flex-1 min-h-0 -mr-4 pr-4">
                                            <div className="space-y-4">
                                                {isLoadingMessages ?
                                                    (<div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>)
                                                    : messages.length > 0 ? messages.map((message) => (
                                                        <ChatMessage ref={(el) => messageRefs.current.set(message.id, el)} key={message.id} isUser={message.role === 'user'} senderName={message.role === 'user' ? getUserName() : 'Eido AI'} avatarUrl={message.role === 'user' ? userProfile?.avatar_url : undefined} content={message.content} isSelected={selectedMessageId === message.id} onClick={() => handleMessageSelect(message)} onCitationClick={handleCitationClick} attachedFiles={message.attached_files} />
                                                    )) : (
                                                      <div className="flex flex-col items-center justify-center h-full text-center text-stone-500 pt-20">
                                                        <img src="/eido-icon.png" alt="Eido AI" className="w-16 h-16 mb-4 opacity-50"/>
                                                        <h2 className="text-lg font-semibold text-stone-700">Eido AI Oracle</h2>
                                                        <p className="text-sm">How can I help you with your coursework today?</p>
                                                      </div>
                                                    )}
                                                {isChatLoading && !isLoadingMessages && (<div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>)}
                                                <div ref={messagesEndRef} />
                                            </div>
                                        </ScrollArea>
                                        <div className="pt-4 border-t border-stone-200 flex-shrink-0">
                                            {attachedFiles.length > 0 && (
                                                <div className="px-1 pb-2">
                                                    <ScrollArea className="w-full whitespace-nowrap">
                                                        <div className="flex items-center gap-2 pb-2">
                                                            {attachedFiles.map(file => (<AttachedFilePill key={file.id} file={file} onRemove={handleRemoveFile} />))}
                                                        </div>
                                                    </ScrollArea>
                                                </div>
                                            )}
                                            <div className="relative">
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                      <Button variant="ghost" size="icon" className="absolute left-2 bottom-1/2 translate-y-1/2 h-8 w-8 text-stone-500 hover:text-stone-800 hover:bg-stone-100" onClick={() => fileInputRef.current?.click()}>
                                                          <PlusCircle className="h-5 w-5" />
                                                      </Button>
                                                  </TooltipTrigger>
                                                  <TooltipContent><p>Attach PDF or Image</p></TooltipContent>
                                                </Tooltip>
                                                <Textarea placeholder="Ask about your documents, or attach a file..." className="min-h-[60px] bg-stone-50 pl-12 pr-24 resize-none" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={isChatLoading} />
                                                <Button className="absolute bottom-3 right-3" onClick={handleSendMessage} disabled={isChatLoading || (input.trim() === "" && attachedFiles.length === 0)}>Send</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="w-[40%] flex flex-col h-full rounded-lg border border-marble-400 bg-white overflow-hidden">
                                <header className="flex items-center justify-between gap-x-2 border-b border-marble-400 px-4 h-14 flex-shrink-0">
                                    <h2 className="font-semibold text-foreground">Sources</h2>
                                    <ToggleGroup type="single" defaultValue="sources" size="sm" className="h-8">
                                        <ToggleGroupItem value="sources" aria-label="View sources"><BookCheck className="h-4 w-4 mr-2"/>Sources</ToggleGroupItem>
                                        <ToggleGroupItem value="upload" aria-label="View files"><Files className="h-4 w-4 mr-2"/>Upload</ToggleGroupItem>
                                    </ToggleGroup>
                                </header>
                                <div className="flex-1 flex flex-col min-h-0">
                                    <div className={cn("transition-all duration-300 ease-in-out", selectedSourceId === null ? 'flex-1 min-h-0' : 'flex-shrink-0')}>
                                        <div className="h-full p-4">
                                            <ScrollArea className="h-full pr-2" style={{ scrollPaddingTop: '1rem' }}>
                                                <div className="space-y-4">
                                                    {sourcesToDisplay.length > 0 ? (
                                                        sourcesToDisplay.filter(source => selectedSourceId === null || selectedSourceId === source.file.file_id).map((source) => (
                                                            <div
                                                                key={source.file.file_id}
                                                                ref={(el) => sourceTextRefs.current.set(source.file.file_id, el)}
                                                                onClick={() => handleSourceSelect(source.file.file_id)}
                                                                className={cn(
                                                                    "p-3 bg-stone-50 rounded-lg border cursor-pointer transition-all relative group",
                                                                    selectedSourceId === source.file.file_id ? "border-stone-700" : "border-stone-200 hover:border-stone-300"
                                                                )}
                                                            >
                                                                {selectedSourceId === source.file.file_id && (
                                                                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-stone-400 hover:text-stone-700" onClick={(e) => { e.stopPropagation(); setSelectedSourceId(null); }}>
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                                <p className="text-xs font-semibold text-stone-700 mb-1 pr-6">Source {source.number}: {source.file.name} (Page {source.pageNumber || 'N/A'})</p>
                                                                <blockquote className="text-sm text-stone-600 border-l-2 pl-3 whitespace-pre-wrap">{source.content}</blockquote>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-center text-sm text-muted-foreground pt-10">Select a message with citations to see sources.</div>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className={cn("flex flex-col transition-all duration-300 ease-in-out", selectedSourceId === null ? 'flex-shrink-0' : 'flex-1 min-h-0')}>
                                        <div className="min-h-0 flex-1 p-4">
                                            {selectedSourceId === null ? (
                                                <ScrollArea className="w-full h-full">
                                                    <div className="flex w-max space-x-4 pb-2 h-full">
                                                        {sourcesToDisplay.map((source) => (
                                                            <div
                                                                key={source.file.file_id}
                                                                ref={(el) => sourceThumbnailRefs.current.set(source.file.file_id, el)}
                                                                onClick={() => handleSourceSelect(source.file.file_id)}
                                                                className="flex-shrink-0 w-56 flex flex-col text-center cursor-pointer"
                                                            >
                                                                <p className="text-xs font-medium text-stone-700 mb-2 truncate" title={source.file.name}>{source.file.name}</p>
                                                                <div className={cn("h-56 bg-stone-100 rounded-md border flex items-center justify-center overflow-hidden", selectedSourceId === source.file.file_id ? "border-stone-700" : "border-stone-200")}>
                                                                    <ScrollArea className="h-full w-full">
                                                                        <img src={source.file.thumbnail_url || `https://placehold.co/224x224/e2e8f0/334155?text=PDF`} alt="PDF Thumbnail" className="w-full h-auto"/>
                                                                    </ScrollArea>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <ScrollBar orientation="horizontal" />
                                                </ScrollArea>
                                            ) : (
                                                <div className="w-full h-full flex flex-col relative">
                                                    <div ref={pdfPreviewRef} className="flex-1 w-full h-full rounded-md border border-stone-700 overflow-hidden flex justify-center bg-stone-100">
                                                        <ScrollArea className="h-full w-full">
                                                            <div className="flex flex-col items-center py-4">
                                                                {selectedFile && selectedFile.url && (
                                                                    <Document file={selectedFile.url} onLoadSuccess={onDocumentLoadSuccess} loading={<Loader2 className="h-8 w-8 animate-spin text-stone-400 mx-auto mt-10"/>}>
                                                                        {Array.from(new Array(numPages || 0), (el, index) => (
                                                                            <div key={`page_wrapper_${index + 1}`} ref={(el) => { if(el) pageRefs.current.set(index + 1, el); }} data-page-number={index + 1}>
                                                                                <Page pageNumber={index + 1} scale={scale} renderTextLayer={false} className="mb-4 shadow-md"/>
                                                                            </div>
                                                                        ))}
                                                                    </Document>
                                                                )}
                                                            </div>
                                                        </ScrollArea>
                                                    </div>
                                                    {numPages && (
                                                        <>
                                                            <div className="absolute bottom-14 right-6 flex items-center gap-2">
                                                                <Button variant="outline" size="icon" onClick={handleZoomOut}><ZoomOut className="h-4 w-4" /></Button>
                                                                <Button variant="outline" size="icon" onClick={handleZoomIn}><ZoomIn className="h-4 w-4" /></Button>
                                                            </div>
                                                            <div className="flex items-center justify-center p-2 flex-shrink-0">
                                                                <Button variant="ghost" size="icon" onClick={goToPrevPage} disabled={currentPage <= 1}>
                                                                    <ChevronLeft className="h-4 w-4" />
                                                                </Button>
                                                                <span className="text-sm font-medium mx-4">Page {currentPage} of {numPages}</span>
                                                                <Button variant="ghost" size="icon" onClick={goToNextPage} disabled={currentPage >= numPages}>
                                                                    <ChevronRight className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </main>
                        <AlertDialog open={!!conversationToDelete} onOpenChange={(open) => !open && setConversationToDelete(null)}>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete Chat?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{conversationToDelete?.name}"? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>
                                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </TooltipProvider>
            </MainAppLayout>
        </>
    );
};

export default OraclePage;
