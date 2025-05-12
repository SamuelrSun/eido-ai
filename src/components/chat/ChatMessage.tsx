// src/components/chat/ChatMessage.tsx
import React from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer'; // Assuming this path is correct
import { Button } from '@/components/ui/button'; // Assuming this path is correct

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  timestamp?: string;
  onCopy?: () => void;
  isCopied?: boolean;
}

export function ChatMessage({ content, isUser, timestamp, onCopy, isCopied = false }: ChatMessageProps) {
  return (
    // The classes 'user-message' and 'ai-message' are from your App.css or index.css
    <div className={`p-3 rounded-lg my-2 max-w-[85%] ${isUser ? 'bg-blue-100 dark:bg-blue-800 ml-auto text-right' : 'bg-gray-100 dark:bg-gray-700 mr-auto text-left'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">
          {/* Changed "CyberCoach AI" to "Super Tutor" */}
          {isUser ? 'You' : 'Super Tutor'}
        </span>
        {timestamp && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{timestamp}</span>
        )}
        {!isUser && onCopy && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-gray-500 hover:text-primary h-7 px-2" // Adjusted hover color
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

      {isUser ? (
        <p className="whitespace-pre-wrap">{content}</p> // Added whitespace-pre-wrap for user messages too
      ) : (
        <>
          <MarkdownRenderer content={content} />

          {/* Feedback buttons can be kept or removed based on your preference */}
          <div className="flex items-center mt-3 space-x-2 text-sm">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-primary">
              <ThumbsUp className="h-4 w-4 mr-1" />
              <span>Helpful</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-primary">
              <ThumbsDown className="h-4 w-4 mr-1" />
              <span>Not helpful</span>
            </Button>
            {/*
            <Button variant="link" size="sm" className="text-primary hover:text-primary/80">
              Suggest a better answer
            </Button>
            */}
          </div>
        </>
      )}
    </div>
  );
}
