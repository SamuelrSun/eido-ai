// src/types/oracle.ts

import { User } from '@supabase/supabase-js';
import { AppConversation } from '@/services/conversationService';
import { ChatMessageApp, ActiveSource } from '@/services/chatMessageService';
import { ClassConfig } from '@/services/classOpenAIConfig';
import { AttachedFile } from '@/components/chat/AttachedFilePill';
import { FileType } from '@/features/files/types';

export interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
}

export interface OracleState {
  // State
  input: string;
  isChatLoading: boolean;
  isPageLoading: boolean;
  user: User | null;
  userProfile: ProfileData | null;
  conversations: AppConversation[];
  selectedConversationId: string | null;
  messages: ChatMessageApp[];
  classes: ClassConfig[];
  selectedClassId: string | null;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  selectedMessageId: string | null;
  attachedFiles: AttachedFile[];
  openSourceTabs: ActiveSource[];
  isHistoryCollapsed: boolean;
  selectedSourceNumber: number | null;
  
  // Derived State
  sourcesToDisplay: ActiveSource[];
  selectedFile: FileType | null;

  // Refs
  messagesEndRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  
  // Handlers
  setInput: React.Dispatch<React.SetStateAction<string>>;
  selectConversation: (id: string | null) => void;
  handleClassChange: (id: string | null) => void;
  setAttachedFiles: React.Dispatch<React.SetStateAction<AttachedFile[]>>;
  setIsHistoryCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  handleSendMessage: () => Promise<void>;
  handleNewChat: () => Promise<void>;
  handleRenameConversation: (id: string, newName: string) => Promise<void>;
  handleDeleteConversation: (conversation: AppConversation) => void;
  handleMessageSelect: (message: ChatMessageApp) => void;
  handleCitationClick: (message: ChatMessageApp, sourceNumber: number) => void;
  handleSourceSelect: (sourceNumber: number) => void;
  handleClearSourceSelection: () => void;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handlePaste: (event: React.ClipboardEvent) => void;
  handleRemoveFile: (fileId: string) => void;
  // MODIFICATION: Added the handleDrop function signature
  handleDrop: (event: React.DragEvent) => void;
  confirmDelete: () => Promise<void>;
  
  // Dialog state
  conversationToDelete: AppConversation | null;
  setConversationToDelete: React.Dispatch<React.SetStateAction<AppConversation | null>>;
  isDeleting: boolean;
}