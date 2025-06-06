// src/features/files/types.ts

export interface FolderType {
  folder_id: string;
  name: string;
  parent_id: string | null;
  user_id: string;
  created_at: string;
  class_id: string | null;
  database_id: string | null;
}

export interface FileType {
  file_id: string; // PK
  name: string;
  size: number;
  type: string; // This is the file's MIME type
  url?: string | null;
  folder_id: string | null;
  user_id: string;
  last_modified: string;
  created_at: string;
  category: string | null;
  tags: string[] | null;
  status: string | null;
  progress?: number; // <<-- FIX: Added optional progress property
  class_id: string | null;
  database_id: string | null;
  openai_file_id?: string | null;
  document_title?: string | null;
}

export interface SelectedItem {
  id: string; 
  name: string;
  type: 'file' | 'folder';
  url?: string | null;
  size?: number;
  fileMimeType?: string;
}

export interface UserStorage {
  user_id: string;
  storage_used: number;
  storage_limit: number;
}

export interface VectorStoreFileType {
  id: string; 
  object: "vector_store.file";
  usage_bytes: number;
  created_at: number; 
  vector_store_id: string;
  status: "in_progress" | "completed" | "failed" | "cancelled";
  last_error: { code: string; message: string } | null;
  filename?: string;       
  document_title?: string; 
}