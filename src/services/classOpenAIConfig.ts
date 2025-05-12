// src/services/classOpenAIConfig.ts

// Interface for OpenAI specific configurations for a class
// API Key is no longer stored or handled on the client-side.
export interface OpenAIConfig {
  vectorStoreId?: string | null; // From your 'classes' table
  assistantId?: string | null;   // From your 'classes' table
}

// Interface for the application's representation of a class
export interface ClassConfig {
  class_id: string; // Changed from id, matches 'classes.class_id'
  title: string;    // Matches 'classes.class_title'
  professor?: string | null;
  classTime?: string | null;
  classroom?: string | null;
  emoji?: string | null;
  enabledWidgets?: string[] | null;
  openAIConfig: OpenAIConfig; // Uses the updated OpenAIConfig
}

// This DBRow interface was used internally in your service.
// It should align with the 'classes' table structure from your Supabase schema.
// The 'CustomDatabase' type in src/integrations/supabase/client.ts
// will be the primary source of truth for DB row structures.
// This local definition is for conceptual mapping within this service.
interface ClassConfigDBRow {
  class_id: string; // PK
  class_title: string;
  professor?: string | null;
  class_time?: string | null;
  classroom?: string | null;
  // api_key is removed
  vector_store_id?: string | null;
  assistant_id?: string | null;
  user_id?: string | null; // FK
  emoji?: string | null;
  enabled_widgets?: string[] | null; // Array of text
  created_at?: string | null;
  updated_at?: string | null;
}

// ... rest of the service logic will be updated later
export const classOpenAIConfigService = {
  // ...
};
