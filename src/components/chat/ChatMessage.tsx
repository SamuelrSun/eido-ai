// src/components/chat/ChatMessage.tsx
import React, { forwardRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarkdownRenderer } from './MarkdownRenderer';
import { cn } from "@/lib/utils";
import { FileText, Image as ImageIcon } from 'lucide-react';
import { CitationPill } from './CitationPill';
import { ActiveSource } from '@/services/chatMessageService';

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  senderName: string;
  avatarUrl?: string | null;
  isSelected?: boolean;
  onClick?: () => void;
  onCitationClick?: (sourceNumber: number) => void;
  attachedFiles?: { name: string; type: string; }[];
  sources?: ActiveSource[];
  selectedSourceNumber?: number | null;
}

export const ChatMessage = forwardRef<HTMLDivElement, ChatMessageProps>(({
    content,
    isUser,
    senderName,
    avatarUrl,
    isSelected,
    onClick,
    onCitationClick,
    attachedFiles,
    sources,
    selectedSourceNumber,
}, ref) => {
  
  const userInitials = senderName.split(' ').map(n => n[0]).join('').toUpperCase();

  const renderContentWithPills = () => {
    if (isUser || !content || !sources || sources.length === 0) {
      return <MarkdownRenderer content={content} />;
    }
    const paragraphs = content.split(/\n\s*\n/);
    return paragraphs.map((paragraph, pIndex) => {
      const citationMatches = [...paragraph.matchAll(/\[Source (\d+)\]/g)];
      const cleanText = paragraph.replace(/\[Source \d+\]/g, '').trim();
      const citationPills = citationMatches
        .map(match => parseInt(match[1], 10))
        .filter((value, index, self) => self.indexOf(value) === index)
        .map(sourceNumber => sources.find(s => s.number === sourceNumber))
        .filter((source): source is ActiveSource => source !== undefined);
      return (
        <div key={pIndex}>
          {cleanText && <MarkdownRenderer content={cleanText} />}
          {citationPills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {citationPills.map(sourceData => (
                <CitationPill
                  key={`${sourceData.file_id}-${sourceData.number}`}
                  source={sourceData}
                  onClick={() => onCitationClick && onCitationClick(sourceData.number)}
                  isSelected={sourceData.number === selectedSourceNumber}
                />
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div 
        ref={ref}
        onClick={onClick}
        className={cn(
            "group flex w-full flex-row gap-4 text-left transition-all duration-200 ease-in-out justify-start",
            // --- MODIFICATION START ---
            !isUser && !isSelected && "cursor-pointer"
            // --- MODIFICATION END ---
        )}
    >
        <div className={cn(
            "flex gap-3 w-full rounded-lg border p-3 text-sm shadow-sm",
            isUser 
                ? "bg-neutral-800 border-neutral-700 text-neutral-200" 
                : "shimmer-button bg-blue-950/40 border-blue-400/30 text-neutral-200"
        )}>
            <div className="flex-shrink-0">
                <Avatar className="h-8 w-8">
                    {isUser && avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={senderName} />
                    ) : !isUser ? (
                        <AvatarImage src="/eido-icon.png" alt="Eido AI Avatar" />
                    ) : null}
                    <AvatarFallback className="text-xs bg-neutral-700 text-neutral-300">{userInitials}</AvatarFallback>
                </Avatar>
            </div>
            <div className="flex flex-col min-w-0">
                {isUser && attachedFiles && attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {attachedFiles.map((file, index) => (
                            <div key={index} className="flex items-center gap-1.5 pl-2 pr-2 py-1 rounded-md bg-neutral-700 border border-neutral-600 max-w-[180px]">
                                {file.type.startsWith('image/') ? 
                                    <ImageIcon className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" /> : 
                                    <FileText className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
                                }
                                <span className="text-xs text-neutral-300 truncate" title={file.name}>
                                    {file.name}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                
                {content && (
                    <div className="whitespace-pre-wrap [overflow-wrap:anywhere] space-y-4">
                       {renderContentWithPills()}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
});