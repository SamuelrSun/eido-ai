// src/services/chatMessageService.ts
import { supabase } from "@/integrations/supabase/client";
import type { CustomDatabase } from "@/integrations/supabase/client";

export type ChatMessageDBRow = CustomDatabase['public']['Tables']['chat_messages']['Row'];
export type ChatMessageDBInsert = CustomDatabase['public']['Tables']['chat_messages']['Insert'];

export interface ChatMessageApp {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  conversation_id: string;
}

const mapToAppMessage = (dbRow: ChatMessageDBRow): ChatMessageApp => ({
  id: dbRow.id,
  role: dbRow.role as 'user' | 'assistant' | 'system',
  content: dbRow.content,
  createdAt: new Date(dbRow.created_at),
  conversation_id: dbRow.conversation_id!,
});

export const chatMessageService = {
  saveMessage: async (
    messagePayload: Omit<ChatMessageDBInsert, 'user_id' | 'id' | 'created_at'> & { conversation_id: string }
  ): Promise<ChatMessageApp | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated to save messages.");
    }

    const messageToSave: ChatMessageDBInsert = {
      ...messagePayload,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('chat_messages')
      .insert(messageToSave)
      .select()
      .single();

    if (error) {
      console.error("chatMessageService.saveMessage: Error saving message:", error);
      throw error;
    }
    return data ? mapToAppMessage(data as ChatMessageDBRow) : null;
  },

  fetchMessagesByConversation: async (conversationId: string): Promise<ChatMessageApp[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    if (!conversationId) return [];

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }); // Fetch in chronological order

    if (error) {
      console.error("chatMessageService.fetchMessagesByConversation: Error fetching messages:", error);
      throw error;
    }

    return (data || []).map(mapToAppMessage);
  },
};