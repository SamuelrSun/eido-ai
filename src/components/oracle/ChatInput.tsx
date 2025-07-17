// src/components/oracle/ChatInput.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PlusCircle } from 'lucide-react';
import { AttachedFilePill } from '@/components/chat/AttachedFilePill';
import { AttachedFile } from './types'; // Assuming types are moved

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSendMessage: () => void;
  isChatLoading: boolean;
  attachedFiles: AttachedFile[];
  handleRemoveFile: (fileId: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input, setInput, handleSendMessage, isChatLoading, attachedFiles, handleRemoveFile, fileInputRef
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="pt-4 border-t border-stone-200 flex-shrink-0">
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 bottom-1/2 translate-y-1/2 h-8 w-8 text-stone-500 hover:text-stone-800 hover:bg-stone-100"
                onClick={() => fileInputRef.current?.click()}
              >
                <PlusCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Attach PDF or Image</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Textarea
          placeholder="Ask about your documents, or attach a file..."
          className="min-h-[60px] bg-stone-50 pl-12 pr-24 resize-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isChatLoading}
        />
        <Button
          className="absolute bottom-3 right-3"
          onClick={handleSendMessage}
          disabled={isChatLoading || (input.trim() === "" && attachedFiles.length === 0)}
        >
          Send
        </Button>
      </div>
    </div>
  );
};