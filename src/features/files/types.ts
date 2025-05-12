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
  type: string;
  url?: string | null;
  folder_id: string | null;
  user_id: string;
  last_modified: string;
  created_at: string;
  category: string | null;
  tags: string[] | null;
  status: string | null;
  class_id: string | null;
  database_id: string | null;
  openai_file_id?: string | null; // Added for linking to OpenAI's File ID
  document_title?: string | null; // Added for user-friendly title for citations
}

export interface SelectedItem {
  id: string; // This should be file_id or folder_id
  name: string;
  type: 'file' | 'folder';
  url?: string | null;
  size?: number;
}

export interface UserStorage {
  user_id: string;
  storage_used: number;
  storage_limit: number;
}

// Represents a file as returned by OpenAI's Vector Store Files API
// (via your list-vector-store-files Edge Function)
export interface VectorStoreFileType {
  id: string; // This is the OpenAI File ID (file-xxxx) associated with the Vector Store
  object: "vector_store.file";
  usage_bytes: number;
  created_at: number; // Timestamp
  vector_store_id: string;
  status: "in_progress" | "completed" | "failed" | "cancelled";
  last_error: { code: string; message: string } | null;
  // These are added client-side after fetching from your DB for better display
  filename?: string;       // Your original filename
  document_title?: string; // Your user-friendly document title
}