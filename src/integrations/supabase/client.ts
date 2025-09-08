// src/integrations/supabase/client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
// --- FIX: Updated the import to use the correct, centralized type definition file ---
import type { Database } from '@/types/supabase';

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

// Define the CustomDatabase interface which extends the auto-generated Database type.
export interface CustomDatabase extends Database {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      // Ensure all your existing tables are listed here, referencing Database['public']['Tables']
      profiles: Database['public']['Tables']['profiles'];
      classes: Database['public']['Tables']['classes'];
      folders: Database['public']['Tables']['folders']; 
      files: Database['public']['Tables']['files']; 
      "flashcard-decks": Database['public']['Tables']['flashcard-decks'];
      flashcards: Database['public']['Tables']['flashcards'];
      quiz_questions: Database['public']['Tables']['quiz_questions'];
      quizzes: Database['public']['Tables']['quizzes'];
      user_storage: Database['public']['Tables']['user_storage'];
      chat_messages: Database['public']['Tables']['chat_messages'];
      calendar_events: Database['public']['Tables']['calendar_events']; 
    };
    Views: Database['public']['Views'];
    Functions: Database['public']['Functions'];
  };
}

export const supabase: SupabaseClient<CustomDatabase> = createClient<CustomDatabase>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } }
);