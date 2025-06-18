// src/components/chat/ChatMessage.tsx
import React, { forwardRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarkdownRenderer } from './MarkdownRenderer';
import { cn } from '@/lib/utils';
import { FileText, Image as ImageIcon } from 'lucide-react';

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  senderName: string;
  avatarUrl?: string | null;
  isSelected?: boolean;
  onClick?: () => void;
  onCitationClick?: (sourceNumber: number) => void;
  attachedFiles?: { name: string; type: string; }[];
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
}, ref) => {
  
  const userInitials = senderName.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div 
        ref={ref}
        onClick={onClick}
        className={cn(
            "group flex h-fit w-full flex-col gap-2 rounded-md p-2 text-left md:flex-row transition-all duration-200 ease-in-out",
            !isUser && "cursor-pointer",
            isSelected 
                ? "bg-stone-100 border border-stone-400"
                : "border border-transparent hover:bg-stone-100"
        )}
    >
        {/* Avatar Section */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded">
            <Avatar className="h-9 w-9">
                {isUser && avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={senderName} />
                ) : !isUser ? (
                    <AvatarImage src="/chatboteido.png" alt="Eido AI Avatar" />
                ) : null}
                <AvatarFallback className="text-xs bg-stone-200">{userInitials}</AvatarFallback>
            </Avatar>
        </div>

        {/* Message Content Section */}
        <div className="max-w-message items-left flex w-full flex-1 flex-col flex-wrap gap-x-1 md:flex-nowrap">
            <div className="flex w-full flex-col gap-y-1 py-1">
                {/* Render Attached File Pills for User Messages if they exist */}
                {isUser && attachedFiles && attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {attachedFiles.map((file, index) => (
                            <div key={index} className="flex items-center gap-1.5 pl-2 pr-2 py-1 rounded-md bg-stone-100 border border-stone-200 max-w-[180px]">
                                {file.type.startsWith('image/') ? 
                                    <ImageIcon className="h-3.5 w-3.5 text-stone-500 flex-shrink-0" /> : 
                                    <FileText className="h-3.5 w-3.5 text-stone-500 flex-shrink-0" />
                                }
                                <span className="text-xs text-stone-600 truncate" title={file.name}>
                                    {file.name}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Render the main text content */}
                {content && (
                    <div className="text-sm text-stone-700 flex flex-col gap-y-1 whitespace-pre-wrap [overflow-wrap:anywhere] md:max-w-4xl">
                       <MarkdownRenderer content={content} onCitationClick={onCitationClick} />
                    </div>
                )}
            </div>
        </div>
    </div>
  );
});