// src/services/conversationService.ts
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { CustomDatabase } from "@/integrations/supabase/client"; 

// Align with the 'conversations' table schema from your Supabase PDF / types.ts
export type ConversationDBRow = Omit<CustomDatabase['public']['Tables']['conversations']['Row'], 'conversation_title' | 'name'> & {
    title: string; 
};

// For insert, we'll expect 'name' from the app, and map it to 'title' for the DB.
// ADD chatbot_type to the insert payload.
export type ConversationDBInsert = Omit<CustomDatabase['public']['Tables']['conversations']['Insert'], 'conversation_title' | 'name' | 'title' | 'chatbot_type'> & {
    title: string; 
    chatbot_type: string; // Added chatbot_type, assuming it's text like chat_mode
};

// For update, similar mapping.
export type ConversationDBUpdate = Omit<CustomDatabase['public']['Tables']['conversations']['Update'], 'conversation_title' | 'name' | 'title' | 'chatbot_type'> & {
    title?: string;
    chatbot_type?: string; // Allow updating chatbot_type if needed
    updated_at: string; 
};


// Interface for application use, uses 'name' for consistency in the app.
export interface AppConversation {
  id: string; 
  name: string; 
  user_id: string;
  class_id: string;
  chat_mode: 'rag' | 'web'; // This is used to determine chatbot_type for new conversations
  chatbot_type: string; // Added to reflect the DB column
  created_at: Date;
  last_message_at: Date;
  updated_at: Date; 
}

const mapToAppConversation = (dbRow: ConversationDBRow): AppConversation => ({
  id: dbRow.id, 
  name: dbRow.title, 
  user_id: dbRow.user_id,
  class_id: dbRow.class_id,
  chat_mode: dbRow.chat_mode as 'rag' | 'web', 
  chatbot_type: dbRow.chatbot_type, // Map from DB
  created_at: new Date(dbRow.created_at),
  last_message_at: new Date(dbRow.last_message_at),
  updated_at: new Date(dbRow.updated_at),
});

export const conversationService = {
  fetchConversations: async (
    userId: string,
    classId: string,
    chatMode: 'rag' | 'web'
  ): Promise<AppConversation[]> => {
    console.log(`[conversationService] Fetching conversations for user: ${userId}, class: ${classId}, mode: ${chatMode}`);
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('class_id', classId)
      .eq('chat_mode', chatMode) // Assuming you still want to filter by chat_mode for the sidebar
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error("[conversationService] Error fetching conversations:", error);
      throw error;
    }
    console.log(`[conversationService] Fetched ${data?.length || 0} conversations.`);
    return (data || []).map(dbRow => mapToAppConversation(dbRow as unknown as ConversationDBRow));
  },

  createConversation: async (
    // Payload from app will have 'name' and 'chat_mode'. We use chat_mode for chatbot_type.
    payload: { name: string; class_id: string; chat_mode: 'rag' | 'web'; },
    userId: string
  ): Promise<AppConversation> => {
    console.log(`[conversationService] Creating conversation for user: ${userId} with app payload:`, payload);
    const insertData: ConversationDBInsert = {
      title: payload.name, 
      class_id: payload.class_id,
      chat_mode: payload.chat_mode,
      chatbot_type: payload.chat_mode, // Use chat_mode as the value for chatbot_type
      user_id: userId,
    };
    const { data, error } = await supabase
      .from('conversations')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("[conversationService] Error creating conversation:", error.message, error.details, error.hint);
      throw error;
    }
    if (!data) {
      throw new Error("Failed to create conversation: No data returned.");
    }
    console.log("[conversationService] Conversation created successfully:", data);
    return mapToAppConversation(data as unknown as ConversationDBRow);
  },

  renameConversation: async (
    conversationId: string,
    newName: string, 
    userId: string
  ): Promise<AppConversation> => {
    console.log(`[conversationService] Renaming conversation ${conversationId} to "${newName}" for user ${userId}`);
    const updatePayload: ConversationDBUpdate = {
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
    if (!data) {
      throw new Error("Failed to rename conversation: Conversation not found or permission denied.");
    }
    console.log("[conversationService] Conversation renamed successfully:", data);
    return mapToAppConversation(data as unknown as ConversationDBRow);
  },

  deleteConversation: async (
    conversationId: string,
    userId: string
  ): Promise<void> => {
    console.log(`[conversationService] Deleting conversation ${conversationId} for user ${userId}`);
    
    const { error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('conversation_id', conversationId) 
      .eq('user_id', userId); 

    if (messagesError) {
      console.error(`[conversationService] Error deleting messages for conversation ${conversationId}:`, messagesError);
      throw messagesError;
    }
    console.log(`[conversationService] Successfully deleted messages for conversation ${conversationId}.`);

    const { error: conversationError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId) 
      .eq('user_id', userId);

    if (conversationError) {
      console.error(`[conversationService] Error deleting conversation ${conversationId}:`, conversationError);
      throw conversationError;
    }
    console.log(`[conversationService] Conversation ${conversationId} deleted successfully.`);
  },

  updateConversationTimestamp: async (
    conversationId: string,
    userId: string,
    lastMessageAt?: Date 
  ): Promise<AppConversation> => {
    const timestamp = lastMessageAt || new Date();
    console.log(`[conversationService] Updating timestamp for conversation ${conversationId} to ${timestamp.toISOString()} for user ${userId}`);
    
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
    if (!data) {
      throw new Error("Failed to update conversation timestamp: Conversation not found or permission denied.");
    }
    console.log("[conversationService] Conversation timestamp updated successfully:", data);
    return mapToAppConversation(data as unknown as ConversationDBRow);
  },
};
