// src/features/files/types.ts

export interface FolderType {
  folder_id: string;
  name: string;
  user_id: string;
  class_id: string | null;
  parent_id: string | null;
  created_at: string;
}

export interface FileType {
  file_id: string;
  name: string;
  size: number;
  type: string;
  url?: string | null;
  thumbnail_url?: string | null;
  status: 'processing' | 'complete' | 'error' | 'processed_text';
  user_id: string;
  class_id: string | null;
  folder_id: string | null;
  last_modified: string;
  created_at: string;
  category: string | null;
  tags: string[] | null;
}