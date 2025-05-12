// src/integrations/supabase/client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types'; // This will be the auto-generated types

// These should be loaded from environment variables,
// matching your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  console.error('Error: SUPABASE_URL is not defined. Please check your .env file.');
  throw new Error('SUPABASE_URL is not defined.');
}
if (!SUPABASE_PUBLISHABLE_KEY) {
  console.error('Error: SUPABASE_PUBLISHABLE_KEY is not defined. Please check your .env file.');
  throw new Error('SUPABASE_PUBLISHABLE_KEY is not defined.');
}

// Define the CustomDatabase interface which extends the auto-generated Database type
export interface CustomDatabase extends Database {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string | null;
          updated_at: string | null;
          usage_description: string | null;
        };
        Insert: {
          user_id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          usage_description?: string | null;
        };
        Update: {
          user_id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          usage_description?: string | null;
        };
      };
      classes: {
        Row: {
          class_id: string;
          class_title: string;
          vector_store_id: string | null;
          assistant_id: string | null;
          user_id: string | null;
          created_at: string | null;
          updated_at: string | null;
          emoji: string | null;
          professor: string | null;
          class_time: string | null;
          classroom: string | null;
          enabled_widgets: string[] | null;
        };
        Insert: {
          class_id?: string;
          class_title: string;
          vector_store_id?: string | null;
          assistant_id?: string | null;
          user_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          emoji?: string | null;
          professor?: string | null;
          class_time?: string | null;
          classroom?: string | null;
          enabled_widgets?: string[] | null;
        };
        Update: {
          class_id?: string;
          class_title?: string;
          vector_store_id?: string | null;
          assistant_id?: string | null;
          user_id?: string | null;
          updated_at?: string | null;
          emoji?: string | null;
          professor?: string | null;
          class_time?: string | null;
          classroom?: string | null;
          enabled_widgets?: string[] | null;
        };
      };
      database: {
        Row: {
            database_id: string;
            user_id: string | null;
            class_id: string | null;
            created_at: string | null;
        };
        Insert: {
            database_id?: string;
            user_id?: string | null;
            class_id?: string | null;
            created_at?: string | null;
        };
        Update: {
            database_id?: string;
            user_id?: string | null;
            class_id?: string | null;
            created_at?: string | null;
        };
      };
      file_folders: {
        Row: {
          folder_id: string;
          name: string;
          parent_id: string | null;
          user_id: string | null;
          created_at: string | null;
          class_id: string | null;
          database_id: string | null;
        };
        Insert: {
          folder_id?: string;
          name: string;
          parent_id?: string | null;
          user_id?: string | null;
          created_at?: string | null;
          class_id?: string | null;
          database_id?: string | null;
        };
        Update: {
          folder_id?: string;
          name?: string;
          parent_id?: string | null;
          user_id?: string | null;
          class_id?: string | null;
          database_id?: string | null;
        };
      };
      files: {
        Row: {
          file_id: string;
          name: string;
          size: number | null;
          type: string | null;
          folder_id: string | null;
          user_id: string | null;
          url: string | null;
          last_modified: string | null;
          created_at: string | null;
          category: string | null;
          tags: string[] | null;
          status: string | null;
          class_id: string | null;
          database_id: string | null;
        };
        Insert: {
          file_id?: string;
          name: string;
          size?: number | null;
          type?: string | null;
          folder_id?: string | null;
          user_id?: string | null;
          url?: string | null;
          last_modified?: string | null;
          created_at?: string | null;
          category?: string | null;
          tags?: string[] | null;
          status?: string | null;
          class_id?: string | null;
          database_id?: string | null;
        };
        Update: {
          file_id?: string;
          name?: string;
          size?: number | null;
          type?: string | null;
          folder_id?: string | null;
          user_id?: string | null;
          url?: string | null;
          last_modified?: string | null;
          category?: string | null;
          tags?: string[] | null;
          status?: string | null;
          class_id?: string | null;
          database_id?: string | null;
        };
      };
      "flashcard-decks": {
        Row: {
          flashcard_deck_id: string;
          title: string;
          description: string | null;
          color: string | null;
          user_id: string | null;
          created_at: string | null;
          updated_at: string | null;
          card_count: number | null;
          due_cards: number | null;
          new_cards: number | null;
          class_title: string | null;
          class_id: string | null;
        };
        Insert: {
          flashcard_deck_id?: string;
          title: string;
          description?: string | null;
          color?: string | null;
          user_id?: string | null;
          card_count?: number | null;
          due_cards?: number | null;
          new_cards?: number | null;
          class_title?: string | null;
          class_id?: string | null;
        };
        Update: {
          flashcard_deck_id?: string;
          title?: string;
          description?: string | null;
          color?: string | null;
          user_id?: string | null;
          card_count?: number | null;
          due_cards?: number | null;
          new_cards?: number | null;
          class_title?: string | null;
          class_id?: string | null;
        };
      };
      flashcards: {
        Row: {
          flashcard_id: string;
          flashcard_deck_id: string;
          front: string;
          back: string;
          difficulty: string | null;
          next_review: string | null;
          last_reviewed: string | null;
          review_count: number | null;
          created_at: string | null;
          updated_at: string | null;
          user_id: string | null;
          class_id: string | null;
        };
        Insert: {
          flashcard_id?: string;
          flashcard_deck_id: string;
          front: string;
          back: string;
          difficulty?: string | null;
          next_review?: string | null;
          last_reviewed?: string | null;
          review_count?: number | null;
          user_id?: string | null;
          class_id?: string | null;
        };
        Update: {
          flashcard_id?: string;
          flashcard_deck_id?: string;
          front?: string;
          back?: string;
          difficulty?: string | null;
          next_review?: string | null;
          last_reviewed?: string | null;
          review_count?: number | null;
          user_id?: string | null;
          class_id?: string | null;
        };
      };
      quiz_questions: {
        Row: {
          quiz_questions_id: string;
          quiz_id: string;
          question_text: string;
          options: string[] | null;
          correct_answer_index: number | null;
          explanation: string | null;
          created_at: string | null;
          user_id: string | null;
          class_id: string | null;
        };
        Insert: {
          quiz_questions_id?: string;
          quiz_id: string;
          question_text: string;
          options?: string[] | null;
          correct_answer_index?: number | null;
          explanation?: string | null;
          user_id?: string | null;
          class_id?: string | null;
        };
        Update: {
          quiz_questions_id?: string;
          quiz_id?: string;
          question_text?: string;
          options?: string[] | null;
          correct_answer_index?: number | null;
          explanation?: string | null;
          user_id?: string | null;
          class_id?: string | null;
        };
      };
      quizzes: {
        Row: {
          quiz_id: string;
          title: string;
          description: string | null;
          question_count: number | null;
          time_estimate: number | null;
          difficulty: string | null;
          coverage: string | null;
          user_id: string | null;
          created_at: string | null;
          updated_at: string | null;
          class_id: string | null;
        };
        Insert: {
          quiz_id?: string;
          title: string;
          description?: string | null;
          question_count?: number | null;
          time_estimate?: number | null;
          difficulty?: string | null;
          coverage?: string | null;
          user_id?: string | null;
          class_id?: string | null;
        };
        Update: {
          quiz_id?: string;
          title?: string;
          description?: string | null;
          question_count?: number | null;
          time_estimate?: number | null;
          difficulty?: string | null;
          coverage?: string | null;
          user_id?: string | null;
          class_id?: string | null;
        };
      };
      user_storage: {
        Row: {
          user_id: string;
          storage_used: number | null;
          storage_limit: number | null;
        };
        Insert: {
          user_id: string;
          storage_used?: number | null;
          storage_limit?: number | null;
        };
        Update: {
          user_id?: string;
          storage_used?: number | null;
          storage_limit?: number | null;
        };
      };
      api_key: {
        Row: {
          id: string;
          user_id: string | null;
          key_name: string | null;
          key_value: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          key_name?: string | null;
          key_value?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          key_name?: string | null;
          key_value?: string | null;
        };
      };
      // user_widgets definition removed as it's not currently in the user's schema for class widgets
      embeddings?: {
        Row: {
          id: string;
          content: string | null;
          embedding: unknown | null;
          user_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          content?: string | null;
          embedding?: unknown | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          content?: string | null;
          embedding?: unknown | null;
          user_id?: string | null;
        };
      };
    };
  };
}

// Create and export the Supabase client with the custom types
export const supabase: SupabaseClient<CustomDatabase> = createClient<CustomDatabase>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
