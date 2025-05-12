// src/integrations/supabase/client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types'; // This is the auto-generated types

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
// This ensures our client uses the specific table and column names from our schema.
export interface CustomDatabase extends Database {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      // Use the types directly from the auto-generated Database type
      // This assumes your src/integrations/supabase/types.ts is up-to-date
      // and reflects the schema names we've been working with.

      profiles: Database['public']['Tables']['profiles'];
      
      classes: Database['public']['Tables']['classes'];
      
      database: Database['public']['Tables']['database'];
      
      file_folders: Database['public']['Tables']['file_folders'];
      
      // Simplified 'files' definition, as openai_file_id and document_title
      // are confirmed to be present in Database['public']['Tables']['files']
      // from your auto-generated types.ts file.
      files: Database['public']['Tables']['files']; 
      
      "flashcard-decks": Database['public']['Tables']['flashcard-decks'];
      
      flashcards: Database['public']['Tables']['flashcards'];
      
      quiz_questions: Database['public']['Tables']['quiz_questions'];
      
      quizzes: Database['public']['Tables']['quizzes'];
      
      user_storage: Database['public']['Tables']['user_storage'];

      // For 'embeddings': Similar to user_widgets, ensure it exists in your types.ts
      // if you intend to use it directly here. If not, remove this line.
      embeddings?: Database['public']['Tables']['embeddings'];
    };
  };
}

export const supabase: SupabaseClient<CustomDatabase> = createClient<CustomDatabase>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } }
);
