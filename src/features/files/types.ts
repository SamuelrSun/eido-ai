// src/features/files/types.ts

// Represents a folder in your database
export interface FolderType {
  folder_id: string; // Changed from id, PK
  name: string;
  parent_id: string | null; // FK to file_folders.folder_id
  user_id: string; // FK to auth.users.id
  created_at: string;
  class_id: string | null; // FK to classes.class_id
  database_id: string | null; // FK to database.database_id
}

// Represents a file in your database
export interface FileType {
  file_id: string; // Changed from id, PK
  name: string;
  size: number; // Should match 'bigint' from schema, so number is fine in JS/TS
  type: string;
  url?: string | null; // URL from Supabase Storage
  folder_id: string | null; // FK to file_folders.folder_id
  user_id: string; // FK to auth.users.id
  last_modified: string; // Timestamp
  created_at: string; // Timestamp
  category: string | null;
  tags: string[] | null; // Array of text
  status: string | null; // General status from DB (e.g., 'complete', 'error_processing_vector')
                        // UI-specific upload progress/status can be handled separately.
  class_id: string | null; // FK to classes.class_id
  database_id: string | null; // FK to database.database_id
  // progress?: number; // This is likely a UI concern during upload, not part of the stored FileType.
                       // If you need to track processing stages in the DB, add a more descriptive status.
}

// Represents an item selected in the UI (could be a file or folder)
export interface SelectedItem {
  id: string; // This should be the actual PK: file_id or folder_id
  name: string;
  type: 'file' | 'folder';
  url?: string | null; // Relevant for files
  size?: number;       // Relevant for files
}

// Represents user's storage usage (matches your user_storage table)
export interface UserStorage {
  user_id: string; // PK
  storage_used: number; // bigint
  storage_limit: number; // bigint
}

// Represents a file as returned by OpenAI's Vector Store Files API
// (via your list-vector-store-files Edge Function)
export interface VectorStoreFileType {
  id: string; // This is the OpenAI File ID *within the Vector Store context* (vs_file_xxxx)
  object: "vector_store.file"; // Typically "vector_store.file"
  usage_bytes: number; // Or 'size' depending on what your Edge Function returns
  created_at: number; // Timestamp
  vector_store_id: string;
  status: "in_progress" | "completed" | "failed" | "cancelled";
  last_error: { code: string; message: string } | null;
  // The original OpenAI File object (file_xxxx) might be nested or you might only care about its ID
  // For display, you might need to fetch original file metadata from your own `files` table
  // if you store a mapping between your file_id and the openAIFileId.
  // For now, let's assume your Edge function might try to return something usable for display:
  filename?: string; // You might want your Edge Function to try and add this if possible,
                     // otherwise you'd only have the ID.
                     // The actual OpenAI VectorStoreFile object doesn't have 'filename' directly.
                     // It has an 'id' which is the ID of the File object (file_xxxx) associated.
}
