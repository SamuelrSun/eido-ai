import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace these with your actual Supabase project URL and anon key.
// You can find these in your Supabase project's API settings.
const supabaseUrl = 'https://a6c2f507c2ddabf9a3ec923c28e05fc476bd1a9fa8f55345463b87144d690a35.supabase.co';
const supabaseAnonKey = '3ca3a75da0ace41c81c1cc353e5eefb50639b1e9b243af421e031e308f476159';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // We will manage auth state manually in the extension
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
});