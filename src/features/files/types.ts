// src/features/files/types.ts

// Type definitions for folder and file objects in the application

export interface FolderType {
  folder_id: string;
  folder_name: string; // Renamed from 'name' 
  parent_id: string | null;
  user_id: string;
  created_at: string;
  class_id: string | null;
  // Deleted: database_id 

  // For UI convenience (derived, not directly from DB row) - assuming these were for display
  files?: number; // Made optional if derived
  size?: string; // Made optional if derived
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
  progress?: number; // <<-- FIX: Added optional progress property (kept as per your original provided code for this file)
  class_id: string | null;
  // Deleted: database_id 
  // Deleted: openai_file_id 
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

// This interface is likely related to OpenAI's Vector Store Files API,
// which might not be directly used if openai_file_id was removed and
// vector_store_id is no longer on the classes table.
// Keeping it for now, but its relevance will need to be re-evaluated
// when rebuilding the file ingestion/vectorization workflow.
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