// src/services/conversationService.ts
import { supabase } from "@/integrations/supabase/client";
import type { CustomDatabase } from "@/integrations/supabase/client";

export type ConversationDBRow = CustomDatabase['public']['Tables']['conversations']['Row'];
export type ConversationDBInsert = CustomDatabase['public']['Tables']['conversations']['Insert'];
export type ConversationDBUpdate = CustomDatabase['public']['Tables']['conversations']['Update'];

export interface AppConversation {
  id: string;
  name: string;
  user_id: string;
  class_id: string;
  chat_mode: 'rag' | 'web';
  created_at: Date;
  last_message_at: Date;
  updated_at: Date;
  chatbot_type: string;
}

const mapToAppConversation = (dbRow: ConversationDBRow): AppConversation => ({
  id: dbRow.id,
  name: dbRow.title || 'Untitled',
  user_id: dbRow.user_id,
  class_id: dbRow.class_id || '',
  chat_mode: dbRow.chat_mode as 'rag' | 'web',
  chatbot_type: dbRow.chatbot_type,
  created_at: new Date(dbRow.created_at || 0),
  last_message_at: new Date(dbRow.last_message_at || 0),
  updated_at: new Date(dbRow.updated_at || 0),
});

export const conversationService = {
  fetchConversations: async (
    userId: string,
    classId: string,
    chatMode: 'rag' | 'web',
    limit?: number
  ): Promise<AppConversation[]> => {
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('class_id', classId)
      .eq('chat_mode', chatMode)
      .order('last_message_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[conversationService] Error fetching conversations:", error);
      throw error;
    }
    return (data || []).map(dbRow => mapToAppConversation(dbRow));
  },

  createConversation: async (
    payload: { name: string; class_id: string; chat_mode: 'rag' | 'web'; chatbot_type: string; },
    userId: string
  ): Promise<AppConversation> => {
    const insertData: ConversationDBInsert = {
      title: payload.name,
      class_id: payload.class_id,
      chat_mode: payload.chat_mode,
      chatbot_type: payload.chatbot_type, // FIX: Ensure chatbot_type is included
      user_id: userId,
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
  ): Promise<AppConversation> => {
    const updatePayload: Partial<ConversationDBUpdate> = {
        title: newName,
        updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('conversations')
      .update(updatePayload)
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error("[conversationService] Error renaming conversation:", error);
      throw error;
    }
    return mapToAppConversation(data);
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

  updateConversationTimestamp: async (
    conversationId: string,
    userId: string,
    lastMessageAt?: Date
  ): Promise<AppConversation> => {
    const timestamp = lastMessageAt || new Date();

    const updatePayload: Partial<ConversationDBUpdate> = {
        last_message_at: timestamp.toISOString(),
        updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('conversations')
      .update(updatePayload)
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error("[conversationService] Error updating conversation timestamp:", error);
      throw error;
    }
    return mapToAppConversation(data);
  },
};