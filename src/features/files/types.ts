export interface FolderType {
  id: string;
  name: string;
  parent_id: string | null;
  user_id: string;
  created_at: string;
}

export interface FileType {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  folder_id: string | null;
  user_id: string;
  last_modified: string;
  category: string;
  tags: string[];
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
}

export interface SelectedItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  url?: string;
  size?: number;
}

export interface UserStorage {
  storage_used: number;
  storage_limit: number;
}

export interface VectorStoreFileType {
  id: string;
  filename: string;
  purpose: string;
  created_at: number;
  modified_at: number;
  size?: number;
} 