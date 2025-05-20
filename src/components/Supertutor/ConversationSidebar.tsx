// src/components/SuperTutor/ConversationSidebar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle, MessageSquare, MoreHorizontal, Edit3, Trash2, Loader2, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Conversation {
  id: string;
  name: string;
  last_message_at?: string; 
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  onSelect,
  onRename,
  onDelete,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(conversation.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleRenameSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newName.trim() && newName.trim() !== conversation.name) {
      onRename(conversation.id, newName.trim());
    }
    setIsRenaming(false);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  return (
    <div
      className={cn(
        'flex items-center justify-between p-2.5 my-0.5 rounded-lg cursor-pointer group relative transition-colors duration-150',
        isSelected
          ? 'bg-slate-200 dark:bg-slate-700' 
          : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'
      )}
      onClick={() => !isRenaming && onSelect(conversation.id)}
      title={conversation.name}
    >
      <div className="flex items-center overflow-hidden">
        <MessageSquare 
          size={18} 
          className={cn(
            'mr-2.5 flex-shrink-0',
            isSelected ? 'text-slate-700 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'
          )} 
        />
        {isRenaming ? (
          <form onSubmit={handleRenameSubmit} className="flex-grow">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 p-1 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary border border-slate-300 dark:border-slate-600" 
              onClick={(e) => e.stopPropagation()}
              onBlur={() => {
                 setTimeout(() => setIsRenaming(false), 100); 
              }}
            />
          </form>
        ) : (
          <p className={cn(
            'text-sm truncate',
            isSelected ? 'text-slate-800 dark:text-slate-50 font-medium' : 'text-slate-700 dark:text-slate-300'
          )}>
            {conversation.name}
          </p>
        )}
      </div>

      {!isRenaming && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation(); 
              setIsMenuOpen(!isMenuOpen);
            }}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
            aria-label="Conversation options"
          >
            <MoreHorizontal size={18} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 rounded-md shadow-lg z-20 border border-slate-200 dark:border-slate-700 py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                  setIsMenuOpen(false); 
                  setNewName(conversation.name);
                }}
                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Edit3 size={14} className="mr-2" /> Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conversation.id);
                  setIsMenuOpen(false);
                }}
                className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <Trash2 size={14} className="mr-2" /> Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ConversationSidebarProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCreateNewConversation: () => void;
  onRenameConversation: (id: string, newName: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onCreateNewConversation,
  onRenameConversation,
  onDeleteConversation,
  isLoading = false,
  className = '',
}) => {
  const newChatButtonColorClasses = "bg-primary hover:bg-primary/90 text-primary-foreground";

  return (
    <div
      className={cn(
        // Changed background to white for light mode, and dark:bg-card to match chat window in dark mode
        'flex flex-col bg-white dark:bg-card w-64 h-full', 
        className 
      )}
      data-testid="conversation-sidebar"
    >
      <div className="p-3 border-b border-slate-300 dark:border-zinc-700">
        <button
          onClick={onCreateNewConversation}
          className={cn(
            "flex items-center justify-center w-full p-2.5 rounded-lg text-sm font-medium transition-colors duration-150 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:focus-visible:ring-offset-card", // Adjusted dark mode offset to dark:bg-card
            newChatButtonColorClasses
          )}
        >
          <PlusCircle size={18} className="mr-2" />
          New Chat
        </button>
      </div>

      <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-zinc-600 scrollbar-track-slate-100 dark:scrollbar-track-zinc-700/50">
        {isLoading && !conversations.length ? (
          <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Loading conversations...</p>
          </div>
        ) : !isLoading && conversations.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center p-4 text-center min-h-[100px]">
            <MessageSquareText size={36} className="mb-3 text-slate-400 dark:text-zinc-500" />
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              No conversations yet.
            </p>
            <p className="text-xs text-slate-400/80 dark:text-zinc-500">
              Start a new chat to begin!
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {conversations.map((convo) => (
              <ConversationItem
                key={convo.id}
                conversation={convo}
                isSelected={convo.id === selectedConversationId}
                onSelect={onSelectConversation}
                onRename={onRenameConversation}
                onDelete={onDeleteConversation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar;
