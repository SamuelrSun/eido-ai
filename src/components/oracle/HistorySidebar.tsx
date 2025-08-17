// src/components/oracle/HistorySidebar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { AppConversation } from '@/services/conversationService';
import { Input } from '../ui/input';

interface HistoryItemProps {
  conversation: AppConversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  onDelete: (conversation: AppConversation) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ conversation, isSelected, onSelect, onRename, onDelete }) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [name, setName] = useState(conversation.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isRenaming) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isRenaming]);

    useEffect(() => {
        if (!isRenaming) {
            setName(conversation.name);
        }
    }, [conversation.name, isRenaming]);

    const handleRenameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (name.trim() && name.trim() !== conversation.name) {
            onRename(conversation.id, name.trim());
        }
        setIsRenaming(false);
    };

    return (
    <div
      onClick={() => !isRenaming && onSelect(conversation.id)}
      className={cn(
        'group flex items-center justify-between px-2 py-1.5 my-0.5 rounded-md cursor-pointer transition-all duration-150 border', 
        // --- MODIFICATION START ---
        isSelected 
            ? 'bg-neutral-800 border-neutral-700' 
            : 'border-transparent hover:bg-neutral-800/50'
        // --- MODIFICATION END ---
      )}
      title={name}
    >
      <div className="flex items-center overflow-hidden flex-grow mr-2">
        {isRenaming ? (
            <form onSubmit={handleRenameSubmit} className="w-full">
                <Input 
                    ref={inputRef} 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    onBlur={handleRenameSubmit} 
                    className="h-7 text-sm bg-neutral-900 border-neutral-700 text-white" 
                    onClick={(e) => e.stopPropagation()} 
                />
            </form>
        ) : (
             <p className={cn('text-sm truncate', isSelected ? 'text-white font-medium' : 'text-neutral-300')}>
                {name}
            </p>
        )}
      </div>

      {!isRenaming && (
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-400 hover:text-white" onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}>
                <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/80 hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(conversation); }}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      )}
    </div>
  );
};

interface HistorySidebarProps {
    conversations: AppConversation[];
    selectedConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onRenameConversation: (id: string, newName: string) => Promise<void>;
    onDeleteConversation: (conversation: AppConversation) => void;
    isLoading: boolean;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ conversations, selectedConversationId, onSelectConversation, onRenameConversation, onDeleteConversation, isLoading }) => {
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-neutral-500" /></div>;
    }

    if (conversations.length === 0) {
        return <div className="flex flex-col items-center justify-center h-full text-center p-4"><p className="text-sm text-neutral-500">No chat history yet.</p></div>;
    }
    
    return (
        <div className="flex flex-col h-full">
            <ScrollArea className="flex-grow">
                <div className="space-y-0.5 p-2">
                    {conversations.map((convo) => (
                        <HistoryItem 
                            key={convo.id} 
                            conversation={convo}
                            isSelected={convo.id === selectedConversationId} 
                            onSelect={onSelectConversation}
                            onRename={onRenameConversation}
                            onDelete={onDeleteConversation}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
};

