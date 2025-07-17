// src/pages/OraclePage.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PanelLeft, PanelRight, MessageSquarePlus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HistorySidebar } from '@/components/oracle/HistorySidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { cn } from '@/lib/utils';
import { useOracle } from '@/hooks/useOracle';
import { ChatInput } from '@/components/oracle/ChatInput';
import { SourcesPanel } from '@/components/oracle/SourcesPanel';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

const OraclePage = () => {
  const {
    input, setInput, isChatLoading, isPageLoading, userProfile,
    conversations, selectedConversationId, setSelectedConversationId,
    messages, classes, selectedClassId, setSelectedClassId,
    isLoadingConversations, isLoadingMessages, selectedMessageId,
    attachedFiles, setAttachedFiles, isHistoryCollapsed, setIsHistoryCollapsed,
    selectedSourceId, sourcesToDisplay, selectedFile,
    messagesEndRef, fileInputRef,
    handleSendMessage, handleNewChat, handleRenameConversation,
    handleDeleteConversation, handleMessageSelect, handleCitationClick,
    handleSourceSelect, handleClearSourceSelection, // The function is correctly retrieved from the hook
    handleFileSelect, handlePaste, handleRemoveFile,
    confirmDelete, conversationToDelete, setConversationToDelete, isDeleting
  } = useOracle();

  const getUserName = () => userProfile?.full_name || "You";

  if (isPageLoading) {
    return (
      <MainAppLayout pageTitle="Oracle | Eido AI">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        </div>
      </MainAppLayout>
    );
  }

  return (
    <>
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/png, image/jpeg, application/pdf" />
      <MainAppLayout pageTitle="Oracle | Eido AI">
        <TooltipProvider delayDuration={100}>
          <div className="flex-1 w-full bg-mushroom-100 flex flex-col relative" onPaste={handlePaste}>
            <main className="absolute inset-0 flex flex-row gap-3 px-3 pb-3">
              {/* Chat and History Panel */}
              <div className="w-[60%] flex flex-row h-full">
                <div className={cn("h-full bg-stone-50 overflow-hidden transition-all duration-300 ease-in-out rounded-l-lg", isHistoryCollapsed ? "w-0" : "w-1/4 min-w-[220px] border-r border-stone-200")}>
                  <div className="flex flex-col h-full">
                    <header className="flex items-center justify-between gap-x-2 px-2 h-14 flex-shrink-0">
                      <div />
                      <Tooltip>
                        <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleNewChat}><MessageSquarePlus className="h-4 w-4" /></Button></TooltipTrigger>
                        <TooltipContent><p>New Chat</p></TooltipContent>
                      </Tooltip>
                    </header>
                    <div className="flex-1 min-h-0">
                      <HistorySidebar conversations={conversations} selectedConversationId={selectedConversationId} onSelectConversation={setSelectedConversationId} onRenameConversation={handleRenameConversation} onDeleteConversation={handleDeleteConversation} isLoading={isLoadingConversations} />
                    </div>
                  </div>
                </div>
                <div className={cn("flex-1 flex flex-col h-full bg-white overflow-hidden border border-marble-400", isHistoryCollapsed ? "rounded-lg" : "rounded-r-lg")}>
                  <header className="flex items-center justify-between gap-x-2 border-b border-marble-400 px-4 h-14 flex-shrink-0">
                    <div className="flex items-center gap-4">
                      <Tooltip>
                        <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}>{isHistoryCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}</Button></TooltipTrigger>
                        <TooltipContent><p>Toggle History</p></TooltipContent>
                      </Tooltip>
                      <Select onValueChange={(value) => { setSelectedClassId(value === 'all' ? null : value); setSelectedConversationId(null); }} value={selectedClassId || "all"}>
                        <SelectTrigger className="w-full sm:w-[220px] h-8 text-xs"><SelectValue placeholder="Select a Class..." /></SelectTrigger>
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
                        {isLoadingMessages ? (<div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>)
                          : messages.length > 0 ? messages.map((message) => (
                            <ChatMessage 
                                key={message.id} 
                                isUser={message.role === 'user'} 
                                senderName={message.role === 'user' ? getUserName() : 'Eido AI'} 
                                avatarUrl={message.role === 'user' ? userProfile?.avatar_url : undefined} 
                                content={message.content} 
                                isSelected={selectedMessageId === message.id} 
                                onClick={() => handleMessageSelect(message)} 
                                onCitationClick={(sourceNumber) => handleCitationClick(message.id, sourceNumber)} 
                                attachedFiles={message.attached_files} />
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
                    <ChatInput input={input} setInput={setInput} handleSendMessage={handleSendMessage} isChatLoading={isChatLoading} attachedFiles={attachedFiles} handleRemoveFile={handleRemoveFile} fileInputRef={fileInputRef} />
                  </div>
                </div>
              </div>
              {/* Sources Panel */}
              <SourcesPanel 
                sourcesToDisplay={sourcesToDisplay} 
                selectedSourceId={selectedSourceId} 
                handleSourceSelect={handleSourceSelect} 
                // MODIFICATION: Pass the missing prop here
                handleClearSourceSelection={handleClearSourceSelection}
                selectedFile={selectedFile} 
              />
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