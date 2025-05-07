
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
  return (
    <div className={`${isUser ? 'user-message' : 'ai-message'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">
          {isUser ? 'You' : 'CyberCoach AI'}
        </span>
        {timestamp && (
          <span className="text-xs text-gray-500 ml-2">{timestamp}</span>
        )}
        {!isUser && onCopy && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-auto text-gray-500 hover:text-cybercoach-blue h-7 px-2"
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
        <p>{content}</p>
      ) : (
        <>
          <MarkdownRenderer content={content} />
          
          <div className="flex items-center mt-3 space-x-2 text-sm">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-cybercoach-blue">
              <ThumbsUp className="h-4 w-4 mr-1" />
              <span>Helpful</span>
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-cybercoach-blue">
              <ThumbsDown className="h-4 w-4 mr-1" />
              <span>Not helpful</span>
            </Button>
            <Button variant="link" size="sm" className="text-cybercoach-teal">
              Suggest a better answer
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
