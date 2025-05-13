// src/components/chat/ChatMessage.tsx
import React from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  timestamp?: string;
  onCopy?: () => void;
  isCopied?: boolean;
}

export function ChatMessage({ content, isUser, timestamp, onCopy, isCopied = false }: ChatMessageProps) {
  // Original classes from your index.css for basic bubble styling
  // user-message: bg-cybercoach-blue-light/20 ml-auto
  // ai-message: bg-gray-100 mr-auto
  // chat-message: p-4 rounded-lg my-2 max-w-[85%] (applied by user-message/ai-message)
  // We'll add shadow-sm for a little depth, which was in the previous version.
  const bubbleBaseClasses = "p-3 rounded-lg my-2 max-w-[85%] shadow-sm"; // Adjusted padding slightly from p-4 to p-3

  return (
    <div 
      className={`${bubbleBaseClasses} ${
        isUser 
          ? 'bg-cybercoach-blue-light/20 ml-auto' // Reverted to original user message background
          : 'bg-gray-100 dark:bg-gray-700 mr-auto' // Kept AI message background
      }`}
    >
      {/* Header section for name and timestamp/actions */}
      <div 
        className={`flex items-center mb-1 ${
          isUser ? 'justify-end' : 'justify-between' // Keeps "You" on the right
        }`}
      >
        {isUser ? (
          <>
            {timestamp && (
              // User message text color will be default (dark) from parent, opacity for timestamp
              <span className="text-xs opacity-80 mr-2">{timestamp}</span>
            )}
            <span className="font-medium text-sm">
              You
            </span>
          </>
        ) : (
          <>
            <span className="font-medium text-sm text-gray-800 dark:text-gray-200"> {/* Ensured AI name color */}
              Super Tutor
            </span>
            <div className="flex items-center">
              {timestamp && (
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">{timestamp}</span>
              )}
              {onCopy && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-blue-300 h-7 px-2"
                  onClick={onCopy}
                  title="Copy to clipboard"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Message content section */}
      {/* Text alignment is handled by ml-auto/mr-auto on the main div and text-left/text-right here */}
      <div className={`${isUser ? 'text-right' : 'text-left'}`}>
        {isUser ? (
          // User message text color will be default (dark)
          <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-700">{content}</p>
        ) : (
          <>
            {/* AI message text color comes from MarkdownRenderer or its parent */}
            <MarkdownRenderer content={content} />
            {/* Feedback buttons */}
            <div className="flex items-center mt-3 space-x-2 text-sm ${isUser ? 'justify-end' : ''}">
              <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-blue-300">
                <ThumbsUp className="h-4 w-4 mr-1" />
                <span>Helpful</span>
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-blue-300">
                <ThumbsDown className="h-4 w-4 mr-1" />
                <span>Not helpful</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}