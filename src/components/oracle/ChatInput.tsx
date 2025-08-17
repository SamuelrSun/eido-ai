// src/components/oracle/ChatInput.tsx
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PlusCircle } from 'lucide-react';
import { AttachedFilePill } from '@/components/chat/AttachedFilePill';
import type { AttachedFile } from '@/components/chat/AttachedFilePill';
import ShimmerButton from '../ui/ShimmerButton';
import { Button } from '../ui/button';

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
    <div className="pt-4 border-t border-neutral-800 flex-shrink-0">
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
      {/* --- MODIFICATION START: Using a robust flex layout for alignment --- */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 flex-shrink-0 text-neutral-400 hover:text-white hover:bg-neutral-800"
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
          className="h-10 min-h-10 bg-neutral-900 border-neutral-700 text-neutral-200 resize-none flex-1 text-sm py-2 px-3"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isChatLoading}
          rows={1}
        />
        
        <ShimmerButton
          size="lg" // Using lg size for h-10
          className="h-10 border border-blue-500 bg-blue-950/80 text-neutral-100 hover:border-blue-400 flex-shrink-0"
          onClick={handleSendMessage}
          disabled={isChatLoading || (input.trim() === "" && attachedFiles.length === 0)}
        >
          Send
        </ShimmerButton>
      </div>
      {/* --- MODIFICATION END --- */}
    </div>
  );
};