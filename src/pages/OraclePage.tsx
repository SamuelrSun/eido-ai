// src/pages/OraclePage.tsx
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PanelLeft, PanelRight, Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HistorySidebar } from '@/components/oracle/HistorySidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ScrollArea } from "@/components/ui/scroll-area";
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { cn } from '@/lib/utils';
import { useOracle } from '@/hooks/useOracle';
import { ChatInput } from '@/components/oracle/ChatInput';
import { SourcesPanel } from '@/components/oracle/SourcesPanel';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import ShimmerButton from '@/components/ui/ShimmerButton';
import { Button } from '@/components/ui/button';

const LoadingIndicator = () => (
  <>
    <style>{`
      @keyframes dot-flashing {
        0% { opacity: 0.2; }
        20% { opacity: 1; }
        100% { opacity: 0.2; }
      }
      .dot-flashing span {
        animation-name: dot-flashing;
        animation-duration: 1.4s;
        animation-iteration-count: infinite;
        animation-fill-mode: both;
        display: inline-block;
        width: 4px;
        height: 4px;
        margin-left: 2px;
        background-color: currentColor;
        border-radius: 50%;
      }
      .dot-flashing span:nth-child(2) { animation-delay: 0.2s; }
      .dot-flashing span:nth-child(3) { animation-delay: 0.4s; }
    `}</style>
    <div className="flex items-center justify-center p-4 text-sm text-neutral-400">
      <span>Searching your files</span>
      <div className="dot-flashing ml-1">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </>
);

const OraclePage = () => {
  const {
    input, setInput, isChatLoading, isPageLoading, user, userProfile,
    conversations, selectedConversationId, selectConversation,
    messages, classes, selectedClassId, handleClassChange,
    isLoadingConversations, isLoadingMessages, selectedMessageId,
    attachedFiles, setAttachedFiles, isHistoryCollapsed, setIsHistoryCollapsed,
    selectedSourceNumber, sourcesToDisplay, selectedFile,
    messagesEndRef, fileInputRef,
    handleSendMessage, handleNewChat, handleRenameConversation,
    handleDeleteConversation, handleMessageSelect, handleCitationClick,
    handleSourceSelect, handleClearSourceSelection,
    handleFileSelect, handlePaste, handleRemoveFile,
    confirmDelete, conversationToDelete, setConversationToDelete, isDeleting
  } = useOracle();

  const getUserName = () => userProfile?.full_name || "You";
  const selectedClassConfig = classes.find(c => c.class_id === selectedClassId) || null;

  return (
    <>
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/png, image/jpeg, application/pdf" />
      <MainAppLayout pageTitle="Oracle | Eido AI">
        <TooltipProvider delayDuration={100}>
          <div className="flex flex-row gap-3 h-full" onPaste={handlePaste}>
              <div className="w-[60%] flex flex-row h-full rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden">
                <div className={cn(
                  "h-full bg-neutral-950 overflow-hidden transition-all duration-300 ease-in-out border-r border-neutral-800",
                  isHistoryCollapsed ? "w-0 border-r-0" : "w-1/4 min-w-[220px]"
                )}>
                  <div className="flex flex-col h-full">
                    <header className="flex items-center justify-center p-2 h-14 flex-shrink-0 border-b border-neutral-800">
                        <ShimmerButton size="sm" className="w-full border border-blue-500 bg-blue-950/80 text-neutral-100 hover:border-blue-400" onClick={handleNewChat}>
                          <Plus className="mr-2 h-4 w-4" />
                          New Chat
                        </ShimmerButton>
                    </header>
                    <div className="flex-1 min-h-0">
                      <HistorySidebar conversations={conversations} selectedConversationId={selectedConversationId} onSelectConversation={selectConversation} onRenameConversation={handleRenameConversation} onDeleteConversation={handleDeleteConversation} isLoading={isLoadingConversations} />
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  <header className="flex items-center justify-between gap-x-2 border-b border-neutral-800 px-4 h-14 flex-shrink-0">
                    <div className="flex items-center gap-4">
                      <Tooltip>
                        <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)} className="text-neutral-400 hover:text-white">{isHistoryCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}</Button></TooltipTrigger>
                        <TooltipContent><p>Toggle History</p></TooltipContent>
                      </Tooltip>
                      <Select
                        onValueChange={(value) => handleClassChange(value === 'all' ? null : value)}
                        value={selectedClassId || "all"}
                      >
                        <SelectTrigger className="w-full sm:w-[220px] h-8 text-xs bg-transparent border-0 text-neutral-200 hover:bg-neutral-800 focus:ring-0">
                          <SelectValue placeholder="Select a Class..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes</SelectItem>
                          {classes.map(cls => (<SelectItem key={cls.class_id} value={cls.class_id}>{cls.class_name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </header>
                  <div className="flex-1 flex flex-col p-4 gap-4 min-h-0">
                    <ScrollArea className="flex-1 min-h-0 -mr-4 pr-4">
                      <div className="space-y-4">
                        {isLoadingMessages ? (<div className="flex items-center justify-center p-4 h-full"><Loader2 className="h-6 w-6 animate-spin text-neutral-500" /></div>)
                          : messages.length > 0 ? messages.map((message) => (
                            <ChatMessage
                                key={message.id}
                                isUser={message.role === 'user'}
                                senderName={message.role === 'user' ? getUserName() : 'Eido AI'}
                                avatarUrl={message.role === 'user' ? userProfile?.avatar_url : undefined}
                                content={message.content}
                                isSelected={selectedMessageId === message.id}
                                onClick={() => handleMessageSelect(message)}
                                // --- MODIFICATION START ---
                                onCitationClick={(sourceNumber) => handleCitationClick(message, sourceNumber)}
                                // --- MODIFICATION END ---
                                attachedFiles={message.attached_files}
                                sources={message.sources}
                                selectedSourceNumber={selectedMessageId === message.id ? selectedSourceNumber : null}
                            />
                          )) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-neutral-500 pt-20">
                              <img src="/eido-icon.png" alt="Eido AI" className="w-16 h-16 mb-4 opacity-50"/>
                              <h2 className="text-lg font-semibold text-neutral-300">Eido AI Oracle</h2>
                              <p className="text-sm">How can I help you with your coursework today?</p>
                            </div>
                          )}
                        {isChatLoading && !isLoadingMessages && <LoadingIndicator />}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    <ChatInput input={input} setInput={setInput} handleSendMessage={handleSendMessage} isChatLoading={isChatLoading} attachedFiles={attachedFiles} handleRemoveFile={handleRemoveFile} fileInputRef={fileInputRef} />
                  </div>
                </div>
              </div>

              <SourcesPanel
                sourcesToDisplay={sourcesToDisplay}
                selectedSourceNumber={selectedSourceNumber}
                handleSourceSelect={handleSourceSelect}
                handleClearSourceSelection={handleClearSourceSelection}
                selectedFile={selectedFile}
                user={user}
              />
            
            <ConfirmationDialog
              isOpen={!!conversationToDelete}
              onOpenChange={(open) => !open && setConversationToDelete(null)}
              onConfirm={confirmDelete}
              title="Delete Chat?"
              description={`Are you sure you want to delete "${conversationToDelete?.name}"? This action cannot be undone.`}
              confirmText="Delete"
              isConfirming={isDeleting}
            />

          </div>
        </TooltipProvider>
      </MainAppLayout>
    </>
  );
};

export default OraclePage;