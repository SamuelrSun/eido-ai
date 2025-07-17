// src/integrations/supabase/types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      calendar_events: {
        Row: {
          id: string
          user_id: string
          class_id: string | null
          title: string
          event_start: string
          event_end: string | null
          location: string | null
          notes: string | null
          event_type: string | null
          created_at: string
          repeat_pattern: string | null // Add the new column here
        }
        Insert: {
          id?: string
          user_id: string
          class_id?: string | null
          title: string
          event_start: string
          event_end?: string | null
          location?: string | null
          notes?: string | null
          event_type?: string | null
          created_at?: string
          repeat_pattern?: string | null // Add the new column here
        }
        Update: {
          id?: string
          user_id?: string
          class_id?: string | null
          title?: string
          event_start?: string
          event_end?: string | null
          location?: string | null
          notes?: string | null
          event_type?: string | null
          created_at?: string
          repeat_pattern?: string | null // Add the new column here
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_messages: {
        Row: {
          attached_files: Json | null
          chat_mode: string
          class_id: string | null
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          attached_files?: Json | null
          chat_mode: string
          class_id?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          attached_files?: Json | null
          chat_mode?: string
          class_id?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey_cascade"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      classes: {
        Row: {
          class_id: string
          class_name: string
          created_at: string | null
          updated_at: string | null
          user_id: string | null
          color: string | null
        }
        Insert: {
          class_id?: string
          class_name: string
          created_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          color?: string | null
        }
        Update: {
          class_id?: string
          class_name?: string
          created_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_user_id_fkey_cascade"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conversations: {
        Row: {
          chat_mode: string | null
          chatbot_type: string
          class_id: string | null
          created_at: string | null
          id: string
          last_message_at: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_mode?: string | null
          chatbot_type: string
          class_id?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_mode?: string | null
          chatbot_type?: string
          class_id?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      embeddings: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      files: {
        Row: {
          category: string | null
          class_id: string | null
          created_at: string
          document_title: string | null
          file_id: string
          folder_id: string | null
          image_summaries: Json | null
          last_modified: string
          name: string
          page_count: number | null
          page_previews: Json | null
          size: number
          status: string | null
          tags: string[] | null
          thumbnail_url: string | null
          type: string
          url: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          class_id?: string | null
          created_at?: string
          document_title?: string | null
          file_id?: string
          folder_id?: string | null
          image_summaries?: Json | null
          last_modified?: string
          name: string
          page_count?: number | null
          page_previews?: Json | null
          size: number
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          type: string
          url?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          class_id?: string | null
          created_at?: string
          document_title?: string | null
          file_id?: string
          folder_id?: string | null
          image_summaries?: Json | null
          last_modified?: string
          name?: string
          page_count?: number | null
          page_previews?: Json | null
          size?: number
          status?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          type?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["folder_id"]
          },
          {
            foreignKeyName: "files_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      "flashcard-decks": {
        Row: {
          card_count: number
          class_id: string | null
          class_title: string | null
          color: string
          created_at: string
          description: string
          due_cards: number
          flashcard_deck_id: string
          new_cards: number
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          card_count?: number
          class_id?: string | null
          class_title?: string | null
          color: string
          created_at?: string
          description: string
          due_cards?: number
          flashcard_deck_id?: string
          new_cards?: number
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          card_count?: number
          class_id?: string | null
          class_title?: string | null
          color?: string
          created_at?: string
          description?: string
          due_cards?: number
          flashcard_deck_id?: string
          new_cards?: number
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flashcard-decks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "flashcard-decks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          class_id: string | null
          created_at: string
          difficulty: string
          flashcard_deck_id: string
          flashcard_id: string
          front: string
          last_reviewed: string | null
          next_review: string
          review_count: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          back: string
          class_id?: string | null
          created_at?: string
          difficulty?: string
          flashcard_deck_id: string
          flashcard_id?: string
          front: string
          last_reviewed?: string | null
          next_review?: string
          review_count?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          back?: string
          class_id?: string | null
          created_at?: string
          difficulty?: string
          flashcard_deck_id?: string
          flashcard_id?: string
          front?: string
          last_reviewed?: string | null
          next_review?: string
          review_count?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "flashcards_flashcard_deck_id_fkey"
            columns: ["flashcard_deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard-decks"
            referencedColumns: ["flashcard_deck_id"]
          },
          {
            foreignKeyName: "flashcards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      folders: {
        Row: {
          class_id: string | null
          created_at: string
          folder_id: string
          name: string | null
          parent_id: string | null
          user_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          folder_id?: string
          name?: string | null
          parent_id?: string | null
          user_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          folder_id?: string
          name?: string | null
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_folders_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "file_folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["folder_id"]
          },
        ]
      }
      message_sources: {
        Row: {
          content: string | null
          created_at: string | null
          file_id: string | null
          highlight: string | null
          id: string
          message_id: string
          name: string | null
          page_number: number | null
          source_number: number
          url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          file_id?: string | null
          highlight?: string | null
          id?: string
          message_id: string
          name?: string | null
          page_number?: number | null
          source_number: number
          url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          file_id?: string | null
          highlight?: string | null
          id?: string
          message_id?: string
          name?: string | null
          page_number?: number | null
          source_number?: number
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_sources_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["file_id"]
          },
          {
            foreignKeyName: "message_sources_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      preview_queue: {
        Row: {
          created_at: string
          error_message: string | null
          file_id: string
          id: number
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          file_id: string
          id?: number
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          file_id?: string
          id?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "preview_queue_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["file_id"]
          },
        ]
      }
      processing_queue: {
        Row: {
          class_id: string
          created_at: string
          error_message: string | null
          folder_id: string | null
          id: number
          mime_type: string
          original_name: string
          size: number
          status: string
          storage_path: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          error_message?: string | null
          folder_id?: string | null
          id?: number
          mime_type: string
          original_name: string
          size: number
          status?: string
          storage_path: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          error_message?: string | null
          folder_id?: string | null
          id?: number
          mime_type?: string
          original_name?: string
          size?: number
          status?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_queue_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "processing_queue_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["folder_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          class_id: string | null
          correct_answer_index: number
          created_at: string
          explanation: string
          options: string[]
          question_text: string
          quiz_id: string
          quiz_questions_id: string
          user_id: string | null
        }
        Insert: {
          class_id?: string | null
          correct_answer_index: number
          created_at?: string
          explanation: string
          options: string[]
          question_text: string
          quiz_id: string
          quiz_questions_id?: string
          user_id?: string | null
        }
        Update: {
          class_id?: string | null
          correct_answer_index?: number
          created_at?: string
          explanation?: string
          options?: string[]
          question_text?: string
          quiz_id?: string
          quiz_questions_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["quiz_id"]
          },
          {
            foreignKeyName: "quiz_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      quizzes: {
        Row: {
          class_id: string | null
          coverage: string
          created_at: string
          description: string
          difficulty: string
          question_count: number
          quiz_id: string
          time_estimate: number
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          class_id?: string | null
          coverage: string
          created_at?: string
          description: string
          difficulty?: string
          question_count?: number
          quiz_id?: string
          time_estimate?: number
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          class_id?: string | null
          coverage?: string
          created_at?: string
          description?: string
          difficulty?: string
          question_count?: number
          quiz_id?: string
          time_estimate?: number
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["class_id"]
          },
        ]
      }
      user_storage: {
        Row: {
          storage_limit: number
          storage_used: number
          user_id: string
        }
        Insert: {
          storage_limit?: number
          storage_used?: number
          user_id: string
        }
        Update: {
          storage_limit?: number
          storage_used?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

