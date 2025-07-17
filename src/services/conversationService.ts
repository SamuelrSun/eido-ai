// src/services/conversationService.ts
import { supabase } from "@/integrations/supabase/client";
import type { CustomDatabase } from "@/integrations/supabase/client";

export type ConversationDBRow = CustomDatabase['public']['Tables']['conversations']['Row'];
export type ConversationDBInsert = CustomDatabase['public']['Tables']['conversations']['Insert'];
export type ConversationDBUpdate = CustomDatabase['public']['Tables']['conversations']['Update'];

// MOVED & EXPORTED: This type is now defined here as its canonical source.
export interface AppConversation {
  id: string;
  name: string;
  user_id: string;
  class_id: string | null;
  chat_mode: 'rag' | 'web' | null;
  created_at: Date;
  last_message_at: Date;
  updated_at: Date;
  chatbot_type: string;
}

const mapToAppConversation = (dbRow: ConversationDBRow): AppConversation => ({
  id: dbRow.id,
  name: dbRow.title || 'Untitled',
  user_id: dbRow.user_id,
  class_id: dbRow.class_id,
  chat_mode: dbRow.chat_mode as 'rag' | 'web' | null,
  chatbot_type: dbRow.chatbot_type,
  created_at: new Date(dbRow.created_at || 0),
  last_message_at: new Date(dbRow.last_message_at || 0),
  updated_at: new Date(dbRow.updated_at || 0),
});

export const conversationService = {
  fetchConversations: async (userId: string, class_id?: string, chat_mode?: 'rag' | 'web'): Promise<AppConversation[]> => {
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId);
      
    if (class_id) {
      query = query.eq('class_id', class_id);
    }
    if (chat_mode) {
      query = query.eq('chat_mode', chat_mode);
    }
  
    query = query.order('last_message_at', { ascending: false, nullsFirst: false });
    
    const { data, error } = await query;

    if (error) {
      console.error("[conversationService] Error fetching conversations:", error);
      throw error;
    }
    return (data || []).map(dbRow => mapToAppConversation(dbRow));
  },

  createConversation: async (
    payload: { name: string; class_id?: string | null; chat_mode?: 'rag' | 'web' | null; chatbot_type?: string; },
    userId: string
  ): Promise<AppConversation> => {
    const now = new Date().toISOString(); // --- FIX: Get current timestamp
    const insertData: ConversationDBInsert = {
      title: payload.name,
      class_id: payload.class_id || null,
      chat_mode: payload.chat_mode || 'rag',
      chatbot_type: payload.chatbot_type || 'oracle',
      user_id: userId,
      // --- FIX: Set last_message_at on creation to ensure correct sorting
      last_message_at: now, 
      updated_at: now,
    };
    
    const { data, error } = await supabase
      .from('conversations')
      .insert(insertData)
      .select()
      .single();
      
    if (error) {
      console.error("[conversationService] Error creating conversation:", error);
      throw error;
    }
    return mapToAppConversation(data);
  },

  renameConversation: async (
    conversationId: string,
    newName: string,
    userId: string
  ): Promise<void> => { 
    const updatePayload: Partial<ConversationDBUpdate> = {
        title: newName,
        updated_at: new Date().toISOString(),
    };
    
    const { error } = await supabase
      .from('conversations')
      .update(updatePayload)
      .eq('id', conversationId)
      .eq('user_id', userId);
      
    if (error) {
      console.error("[conversationService] Error renaming conversation:", error);
      throw error;
    }
  },

  deleteConversation: async (
    conversationId: string,
    userId: string
  ): Promise<void> => {
    const { error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
      
    if (messagesError) {
      console.error(`[conversationService] Error deleting messages for conversation ${conversationId}:`, messagesError);
      throw messagesError;
    }

    const { error: conversationError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);
      
    if (conversationError) {
      console.error(`[conversationService] Error deleting conversation ${conversationId}:`, conversationError);
      throw conversationError;
    }
  },
  
  updateConversationTimestamp: async (conversationId: string, userId: string, timestamp: Date): Promise<AppConversation> => {
    const { data, error } = await supabase
      .from('conversations')
      .update({ last_message_at: timestamp.toISOString() })
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select()
      .single();
      
    if (error) {
      console.error(`[conversationService] Error updating timestamp for conversation ${conversationId}:`, error);
      throw error;
    }
    return mapToAppConversation(data);
  }
};
