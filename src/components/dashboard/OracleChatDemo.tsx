// src/components/dashboard/OracleChatDemo.tsx
import React, { useEffect, useRef } from 'react';
import { useOracle } from '@/hooks/useOracle';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/oracle/ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

// A small, local loading component for the demo
const LoadingIndicator = () => (
  <>
    <style>{`
      @keyframes dot-flashing {
        0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; }
      }
      .dot-flashing span {
        animation: dot-flashing 1.4s infinite both;
        display: inline-block; width: 4px; height: 4px; margin-left: 2px;
        background-color: currentColor; border-radius: 50%;
      }
      .dot-flashing span:nth-child(2) { animation-delay: 0.2s; }
      .dot-flashing span:nth-child(3) { animation-delay: 0.4s; }
    `}</style>
    <div className="flex items-center justify-center p-4 text-sm text-neutral-400">
      <span>Thinking</span>
      <div className="dot-flashing ml-1">
        <span /> <span /> <span />
      </div>
    </div>
  </>
);

export const OracleChatDemo = () => {
  const {
    input, setInput, isChatLoading, isPageLoading, userProfile, messages,
    messagesEndRef, fileInputRef, handleSendMessage, handleFileSelect,
    handlePaste, handleRemoveFile, attachedFiles,
  } = useOracle();

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // This effect ensures the view scrolls to the latest message.
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  if (isPageLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-neutral-500" /></div>;
  }

  return (
    <div className="flex flex-col h-full border-b border-l border-r border-neutral-700/50 rounded-b-md">
      <ScrollArea 
        className="flex-1 min-h-0 [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]" 
        ref={scrollAreaRef}
      >
        {/* --- MODIFICATION: Reduced padding for a tighter layout --- */}
        <div className="space-y-3 p-3">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              isUser={message.role === 'user'}
              senderName={message.role === 'user' ? (userProfile?.full_name || 'You') : 'Eido AI'}
              avatarUrl={message.role === 'user' ? userProfile?.avatar_url : undefined}
              content={message.content}
              attachedFiles={message.attached_files}
              isSelected={false}
            />
          ))}
          {isChatLoading && <LoadingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* --- MODIFICATION: Reduced padding and passed isDemo prop --- */}
      <div className="px-3 pb-3 pt-2">
        <ChatInput
            input={input}
            setInput={setInput}
            handleSendMessage={handleSendMessage}
            isChatLoading={isChatLoading}
            attachedFiles={attachedFiles}
            handleRemoveFile={handleRemoveFile}
            fileInputRef={fileInputRef}
            isDemo={true}
        />
      </div>
    </div>
  );
};