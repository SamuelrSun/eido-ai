// src/pages/OraclePage.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, PlusCircle } from 'lucide-react';
import { HistorySidebar } from '@/components/oracle/HistorySidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { AppConversation, conversationService } from '@/services/conversationService';
import { chatMessageService, ChatMessageApp, ActiveSource } from '@/services/chatMessageService';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ClassConfig, classOpenAIConfigService } from '@/services/classOpenAIConfig';
import { cn } from '@/lib/utils';
import { HighlightedText } from '@/components/chat/HighlightedText';
import { AttachedFile, AttachedFilePill } from '@/components/chat/AttachedFilePill';
// MODIFIED: Import the loader hook
import { usePageLoader } from '@/context/LoaderContext';
import { MainAppLayout } from '@/components/layout/MainAppLayout'; // Import the new layout


interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
}

const OraclePage = () => {
    // MODIFIED: Use the page loader
    const { loader } = usePageLoader();

    const [input, setInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false); // For in-page chat responses
    const [isPageLoading, setPageLoading] = useState(true);   // For initial page load
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
    const [highlightedSourceNumber, setHighlightedSourceNumber] = useState<number | null>(null);
    const sourceRefs = useRef(new Map<number, HTMLDivElement | null>());
    const messageRefs = useRef(new Map<string, HTMLDivElement | null>());
    const keysDown = useRef(new Set<string>());
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

    // ADDED: This useEffect controls the top loading bar.
    // It watches the initial page loading state.
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
                        id: `<span class="math-inline">\\{file\\.name\\}\\-</span>{Date.now()}`,
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

    const activeSources = messages.find(m => m.id === selectedMessageId)?.sources || [];

    const handleMessageSelect = useCallback((message: ChatMessageApp) => {
        if (message.role === 'assistant') {
            setSelectedMessageId(message.id);
        } else {
            setSelectedMessageId(null);
        }
    }, []);

    const highlightKeywords = useMemo(() => {
        if (!selectedMessageId) return [];
        const selectedMessage = messages.find(m => m.id === selectedMessageId);
        if (!selectedMessage || selectedMessage.role !== 'assistant') return [];
        const aiResponseContent = selectedMessage.content;
        const stopWords = new Set(["a", "an", "the", "is", "are", "was", "were", "what", "when", "where", "why", "how", "of", "to", "in", "for", "on", "with", "can", "you", "i", "me", "my", "it", "its", "about", "and", "or", "what", "explain", "summarize", "tell", "me", "about"]);
        return aiResponseContent.toLowerCase().replace(/\(source \d+\)/g, '').replace(/[^\w\s]/g, '').split(/\s+/).filter(word => word.length > 3 && !stopWords.has(word));
    }, [selectedMessageId, messages]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            if (keysDown.current.has(e.key)) return;
            keysDown.current.add(e.key);
            const aiMessages = messages.filter(m => m.role === 'assistant');
            if (aiMessages.length === 0) return;

            const currentIndex = aiMessages.findIndex(m => m.id === selectedMessageId);
            let nextIndex = currentIndex;
            if (e.key === "ArrowLeft") {
                nextIndex = Math.max(0, currentIndex - 1);
            } else {
                nextIndex = currentIndex === -1 ? 0 : Math.min(aiMessages.length - 1, currentIndex + 1);
            }
            if (aiMessages[nextIndex] && aiMessages[nextIndex].id !== selectedMessageId) {
                handleMessageSelect(aiMessages[nextIndex]);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => { keysDown.current.delete(e.key); };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [messages, selectedMessageId, handleMessageSelect]);

    useEffect(() => {
        if (selectedMessageId) {
            const element = messageRefs.current.get(selectedMessageId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, [selectedMessageId]);

    useEffect(() => {
        const fetchUserAndClasses = async () => {
            setPageLoading(true); // Start page loading
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
                        const parsedClass: { class_id: string; class_name: string } = JSON.parse(activeClassDataString);
                        if (fetchedClasses.some(c => c.class_id === parsedClass.class_id)) {
                            setSelectedClassId(parsedClass.class_id);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching initial page data:", error);
                toast({ title: "Error", description: "Could not load initial page data.", variant: "destructive" });
            } finally {
                setPageLoading(false); // Finish page loading
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

            if (convos.length > 0) {
                const currentSelected = convos.find(c => c.id === selectedConversationId && (selectedClassId === null || c.class_id === selectedClassId));
                if (currentSelected) {
                    setSelectedConversationId(currentSelected.id);
                } else {
                    setSelectedConversationId(convos[0].id);
                }
            } else {
                setSelectedConversationId(null);
            }
        } catch (error: unknown) {
            toast({ title: "Error", description: (error instanceof Error) ? error.message : "Could not load chat history.", variant: "destructive" });
        } finally {
            setIsLoadingConversations(false);
        }
    }, [user, toast, selectedClassId, selectedConversationId]);

    useEffect(() => { fetchConversations(); }, [user, fetchConversations]);

    useEffect(() => {
        if (!isChatLoading) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isChatLoading]);

    useEffect(() => {
        if (!selectedConversationId) {
            setMessages([]);
            setSelectedMessageId(null);
            return;
        }
        const fetchMessages = async () => {
             setIsLoadingMessages(true);
            try {
                const fetchedMessagesWithSources = await chatMessageService.fetchMessagesByConversation(selectedConversationId);
                setMessages(fetchedMessagesWithSources);
                const lastAssistantMessage = fetchedMessagesWithSources.filter(m => m.role === 'assistant').pop();
                if (lastAssistantMessage) {
                    handleMessageSelect(lastAssistantMessage);
                } else {
                    setSelectedMessageId(null);
                }
             } catch (error: unknown) {
                toast({ title: "Error", description: (error instanceof Error) ? error.message : "Could not load messages for this chat.", variant: "destructive" });
            } finally {
                setIsLoadingMessages(false);
            }
        };
        fetchMessages();
    }, [selectedConversationId, toast, handleMessageSelect]);

    const handleNewChat = async () => {
        if (!user) return;
        const newName = 'New Chat';
        try {
            const newConvo = await conversationService.createConversation({ name: newName, class_id: selectedClassId, chat_mode: 'rag', chatbot_type: 'oracle' }, user.id);
            setConversations(prev => [newConvo, ...prev]);
            setSelectedConversationId(newConvo.id);
            setMessages([]);
            setSelectedMessageId(null);
        } catch (error: unknown) {
            toast({ title: "Error", description: (error instanceof Error) ? error.message : "Could not create a new chat.", variant: "destructive" });
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
        const updatedMessages = [...messages, tempUserMessage];
        setMessages(updatedMessages);

        const activeConvo = conversations.find(c => c.id === activeConversationId);
        const titleQuery = currentInput || `Chat about ${currentFiles.map(f => f.name).join(', ')}`;
        const shouldGenerateTitle = isNewConversation || (activeConvo?.name === "New Chat");

        try {
            const savedUserMessage = await chatMessageService.saveMessage({
                conversation_id: activeConversationId as string,
                role: 'user',
                content: titleQuery,
                chat_mode: 'rag',
                class_id: selectedClassId,
                attached_files: displayFiles
            });
            setMessages(prev => prev.map(m => m.id === tempUserMessage.id ? savedUserMessage : m));
            if (shouldGenerateTitle) {
                try {
                    const { data } = await supabase.functions.invoke('generate-title', { body: { query: titleQuery } });
                    const titleData: { title?: string; error?: string } = data as { title?: string; error?: string };
                    if (titleData && titleData.title) {
                        await handleRenameConversation(activeConversationId as string, titleData.title);
                    }
                } catch (titleError: unknown) {
                     console.error("Could not auto-generate title:", titleError);
                }
            }

            const payload = {
                message: currentInput,
                history: updatedMessages.slice(0, -1).map(m => ({role: m.role, content: m.content})),
                class_id: selectedClassId,
                files: currentFiles.map(({ id, ...rest }) => rest)
            };
            const { data: aiData, error: aiError } = await supabase.functions.invoke('chat', { body: payload });
            const aiResponse: { response?: string; sources?: ActiveSource[]; error?: string } = aiData as { response?: string; sources?: ActiveSource[]; error?: string };

            if (aiError || !aiResponse || aiResponse.error) {
                throw new Error(aiError?.message || aiResponse?.error || "Invalid response from AI service.");
            }

            const savedAiMessage = await chatMessageService.saveMessage({
                conversation_id: activeConversationId as string,
                role: 'assistant',
                content: aiResponse.response as string,
                chat_mode: 'rag',
                class_id: selectedClassId,
                sources: aiResponse.sources || []
            });
            if (savedAiMessage) {
                setMessages(prev => [...prev.filter(m => m.id !== savedUserMessage.id), savedUserMessage, savedAiMessage]);
                handleMessageSelect(savedAiMessage);
            }

         } catch (error: unknown) {
            toast({ title: "Error", description: (error instanceof Error) ? `Failed to get a response: ${error.message}` : "Failed to get a response: An unknown error occurred.", variant: "destructive" });
            setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleRenameConversation = async (id: string, newName: string) => {
        if (!user) return;
        setConversations(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
        try {
            await conversationService.renameConversation(id, newName, user.id);
            toast({ title: "Chat Renamed", description: `Conversation renamed to "${newName}"`});
        }
         catch (error: unknown) {
             toast({ title: "Error", description: (error instanceof Error) ? error.message : "Failed to rename chat.", variant: "destructive" });
             fetchConversations();
        }
    };

    const handleDeleteConversation = (convo: AppConversation) => { setConversationToDelete(convo); };

    const confirmDelete = async () => {
        if (!conversationToDelete || !user) return;
        setIsDeleting(true);
        try {
             await conversationService.deleteConversation(conversationToDelete.id, user.id);
            const newConvos = conversations.filter(c => c.id !== conversationToDelete.id);
            setConversations(newConvos);
            if (selectedConversationId === conversationToDelete.id) {
                setSelectedConversationId(newConvos.length > 0 ? newConvos[0].id : null);
            }
            toast({ title: "Chat Deleted", description: `"${conversationToDelete.name}" was deleted.` });
        } catch (error: unknown) {
            toast({ title: "Error", description: (error instanceof Error) ? error.message : "Failed to delete chat.", variant: "destructive" });
        } finally {
             setIsDeleting(false);
            setConversationToDelete(null);
        }
    };

    const handleCitationClick = (sourceNumber: number) => {
        const sourceElement = sourceRefs.current.get(sourceNumber);
        if (sourceElement) {
            sourceElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setHighlightedSourceNumber(sourceNumber);
            setTimeout(() => {
                setHighlightedSourceNumber(null);
            }, 2500);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } };
    const getUserName = () => userProfile?.full_name || user?.email?.split('@')[0] || "You";

    return (
        <>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/png, image/jpeg, application/pdf" />
            <style>{`
            :root { --volcanic: #212121; --marble: #fafafa; --green: #39594D; }
            html, body, #root { font-family: "Trebuchet MS", sans-serif; height: 100%; }
             .bg-mushroom-100 { background-color: #75909C; } .bg-marble-100 { background-color: #F8F7F4; }
            .border-marble-400 { border-color:rgb(176, 197, 206); } .text-green-700 { color: #39594D; }
            .font-variable { font-family: "Trebuchet MS", sans-serif; } .text-volcanic-800 { color: #6B7280; }
            .hover\\:text-volcanic-900:hover { color: #212121; } .text-volcanic-900 { color: #212121; }
            .font-code { font-family: monospace; }
            .text-overline { font-size: 0.875rem; line-height: 1.25rem; letter-spacing: 0.05em; text-transform: uppercase; }
             .text-logo { font-size: 1.125rem; line-height: 1.75rem; } .rounded-lg { border-radius: 0.5rem; }
            .header-bg-chat { background-image: url('/background4.png'); background-size: cover; background-position: center; }
            .header-bg-other { background-image: url('/background5.png'); background-size: cover; background-position: center; }
             `}</style>
            <div className="h-screen w-full bg-mushroom-100 flex flex-col" onPaste={handlePaste}>
                <div className="p-3">
                    <nav className="z-navigation flex w-full items-center justify-between rounded-lg border border-marble-400 bg-marble-100 px-4 py-3">
                        <a href="/"><div className="mr-3 flex items-baseline"><span className="text-logo lowercase font-variable ml-1 font-light text-green-700">eido ai</span></div></a>
                        <div className="hidden md:flex flex-row items-center gap-x-4 gap-y-0 lg:gap-x-6 justify-between">
                            <Link to="/"><p className="text-overline uppercase font-code text-volcanic-800 hover:text-volcanic-900">Dashboard</p></Link>
                            <a href="/datasets"><p className="text-overline uppercase font-code text-volcanic-800 hover:text-volcanic-900">Datasets</p></a>
                            <a target="_blank" rel="noopener noreferrer" href="https://docs.cohere.com/"><p className="text-overline uppercase font-code text-volcanic-800 hover:text-volcanic-900">Docs</p></a>
                            <a target="_blank" rel="noopener noreferrer" href="#"><p className="text-overline uppercase font-code text-volcanic-800 hover:text-volcanic-900">Community</p></a>
                        </div>
                    </nav>
                </div>
                <main className="flex-grow flex flex-col md:flex-row gap-3 px-3 pb-3 min-h-0">
                    <div className="flex flex-col md:w-1/2 rounded-lg border border-marble-400 bg-white overflow-hidden">
                        <header className="flex items-center justify-between gap-x-2 border-b border-marble-400 px-4 h-14 flex-shrink-0 header-bg-chat">
                            <h3 className="text-sm uppercase font-semibold text-muted-foreground">Chat</h3>
                        </header>
                        <div className="flex-grow p-4 flex flex-col gap-4 overflow-y-auto">
                            <ScrollArea className="flex-grow pr-4 -mr-4">
                                <div className="space-y-4">
                                    {isLoadingMessages ? (<div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>) : messages.map((message) => (
                                        <ChatMessage
                                          ref={(el) => messageRefs.current.set(message.id, el)}
                                          key={message.id}
                                          isUser={message.role === 'user'}
                                          senderName={message.role === 'user' ? getUserName() : 'Eido AI'}
                                          avatarUrl={message.role === 'user' ? userProfile?.avatar_url : undefined}
                                          content={message.content}
                                          isSelected={selectedMessageId === message.id}
                                          onClick={() => handleMessageSelect(message)}
                                          onCitationClick={handleCitationClick}
                                          attachedFiles={message.attached_files}
                                        />
                                    ))}
                                     {isChatLoading && !isLoadingMessages && (<div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>)}
                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>
                            <div className="mt-auto pt-4 border-t border-stone-200">
                                {attachedFiles.length > 0 && (
                                    <div className="px-1 pb-2">
                                        <ScrollArea className="w-full whitespace-nowrap">
                                            <div className="flex items-center gap-2 pb-2">
                                                {attachedFiles.map(file => (
                                                    <AttachedFilePill key={file.id} file={file} onRemove={handleRemoveFile} />
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                )}
                                <div className="relative">
                                    <Button variant="ghost" size="icon" className="absolute left-2 bottom-1/2 translate-y-1/2 h-8 w-8 text-stone-500 hover:text-stone-800 hover:bg-stone-100" onClick={() => fileInputRef.current?.click()}>
                                        <PlusCircle className="h-5 w-5" />
                                        <span className="sr-only">Attach file</span>
                                    </Button>
                                    <Textarea
                                        placeholder="Ask about your documents, or attach a file..."
                                        className="min-h-[60px] bg-stone-50 pl-12 pr-24 resize-none"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        disabled={isChatLoading}
                                    />
                                    <Button className="absolute bottom-3 right-3" onClick={handleSendMessage} disabled={isChatLoading || (input.trim() === "" && attachedFiles.length === 0)}>Send</Button>
                                 </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col md:w-1/4 rounded-lg border border-marble-400 bg-white overflow-hidden">
                        <header className="flex items-center justify-between gap-x-2 border-b border-marble-400 px-4 h-14 flex-shrink-0 header-bg-other">
                            <h3 className="text-sm uppercase font-semibold text-muted-foreground">Sources</h3>
                        </header>
                        <ScrollArea className="flex-grow p-4">
                             <div className="space-y-4">
                                {activeSources.length > 0 ? (
                                    activeSources.map((source) => (
                                         <div
                                             key={source.number}
                                             className={cn("p-3 border rounded-lg bg-stone-50 border-stone-200 transition-all", highlightedSourceNumber === source.number && "border-2 border-gray-400 shadow-md")}
                                             ref={(el) => sourceRefs.current.set(source.number, el)}
                                         >
                                            <div className="mb-2">
                                               <p className="text-xs font-semibold uppercase text-gray-500">SOURCE {source.number}</p>
                                               <div className="flex items-baseline">
                                                     <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-stone-700 truncate hover:underline">
                                                        {source.name}
                                                     </a>
                                                </div>
                                             </div>
                                            <div className="border-t border-stone-200 pt-2 mt-2">
                                                 <div className="h-48 bg-stone-100 rounded-md p-3 text-xs text-stone-600 overflow-y-auto">
                                                     <HighlightedText text={source.content} keywords={source.highlight ? [source.highlight] : highlightKeywords} />
                                                 </div>
                                             </div>
                                         </div>
                                     ))
                                ) : (
                                     <div className="flex items-center justify-center h-full">
                                        <p className="text-sm text-muted-foreground text-center">Select an AI message to see its sources.</p>
                                     </div>
                                 )}
                             </div>
                        </ScrollArea>
                    </div>
                    <div className="flex flex-col md:w-1/4 gap-3">
                         <div className="flex flex-col h-1/2 rounded-lg border border-marble-400 bg-white overflow-hidden">
                            <header className="flex items-center justify-between gap-x-2 border-b border-marble-400 px-4 h-14 flex-shrink-0 header-bg-other">
                                <h3 className="text-sm uppercase font-semibold text-muted-foreground">Parameters</h3>
                            </header>
                            <div className="p-4 space-y-4 overflow-y-auto">
                                <div>
                                    <Label className="text-xs font-semibold uppercase text-stone-500">Dataset</Label>
                                     <div className="space-y-2 mt-1">
                                         <Select onValueChange={(value) => {
                                            setSelectedClassId(value === 'all' ? null : value);
                                            setSelectedConversationId(null);
                                            setMessages([]);
                                        }} value={selectedClassId || "all"}>
                                             <SelectTrigger><SelectValue placeholder="Select a Dataset..." /></SelectTrigger>
                                             <SelectContent>
                                                 <SelectItem value="all">All Documents</SelectItem>
                                                 {classes.map(cls => (<SelectItem key={cls.class_id} value={cls.class_id}>{cls.class_name}</SelectItem>))}
                                             </SelectContent>
                                         </Select>
                                     </div>
                                 </div>
                             </div>
                        </div>
                         <div className="flex flex-col h-1/2 rounded-lg border border-marble-400 bg-white overflow-hidden">
                            <header className="flex items-center justify-between gap-x-2 border-b border-marble-400 px-4 h-14 flex-shrink-0 header-bg-other">
                                <h3 className="text-sm uppercase font-semibold text-muted-foreground">History</h3>
                                <Button size="sm" onClick={handleNewChat}>New Chat</Button>
                            </header>
                            <div className="flex-grow min-h-0">
                                 <HistorySidebar conversations={conversations} selectedConversationId={selectedConversationId} onSelectConversation={setSelectedConversationId} onRenameConversation={handleRenameConversation} onDeleteConversation={handleDeleteConversation} isLoading={isLoadingConversations} />
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
        </>
    );
};

export default OraclePage;