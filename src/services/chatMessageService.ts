// src/services/chatMessageService.ts
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { CustomDatabase } from "@/integrations/supabase/client"; // Your custom DB types

// Type for a chat message as it's stored/retrieved from the DB
// This should align with the columns in your public.chat_messages table
export type ChatMessageDBRow = CustomDatabase['public']['Tables']['chat_messages']['Row'];

// Type for inserting a new chat message (id and created_at are auto-generated)
export type ChatMessageDBInsert = CustomDatabase['public']['Tables']['chat_messages']['Insert'];

// Type for a chat message as used in the application (similar to ChatBot.tsx's Message)
export interface ChatMessageApp {
  id: string; // Keep the DB id for potential future use (e.g., keys in React lists)
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date; // Use Date object in the app
  // Optional: include user_id, class_id, chat_mode if needed directly in app state
  // userId?: string;
  // classId?: string;
  // chatMode?: 'rag' | 'web';
}

export const chatMessageService = {
  /**
   * Saves a chat message to the database.
   * @param messagePayload - The message data to save.
   * @returns The saved chat message row from the database.
   */
  saveMessage: async (
    messagePayload: Omit<ChatMessageDBInsert, 'user_id'> // user_id will be derived from auth session
  ): Promise<ChatMessageDBRow | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("chatMessageService.saveMessage: User not authenticated.");
      throw new Error("User must be authenticated to save messages.");
    }

    const messageToSave: ChatMessageDBInsert = {
      ...messagePayload,
      user_id: user.id, // Ensure user_id is set from the authenticated user
    };

    console.log("[chatMessageService.saveMessage] Saving message:", messageToSave);

    const { data, error } = await supabase
      .from('chat_messages')
      .insert(messageToSave)
      .select()
      .single();

    if (error) {
      console.error("chatMessageService.saveMessage: Error saving message:", error);
      throw error;
    }
    console.log("[chatMessageService.saveMessage] Message saved successfully:", data);
    return data;
  },

  /**
   * Fetches chat messages for a specific user, class, and chat mode.
   * @param classId - The ID of the class.
   * @param chatMode - The chat mode ('rag' or 'web').
   * @param limit - The maximum number of messages to fetch (default 50).
   * @param beforeTimestamp - Optional: Fetch messages created before this timestamp (for pagination).
   * @returns An array of chat messages for the application.
   */
  fetchMessages: async (
    classId: string,
    chatMode: 'rag' | 'web',
    limit: number = 50,
    beforeTimestamp?: string // ISO string
  ): Promise<ChatMessageApp[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("chatMessageService.fetchMessages: User not authenticated. Returning empty array.");
      return [];
    }

    if (!classId) {
      console.warn("chatMessageService.fetchMessages: classId is required. Returning empty array.");
      return [];
    }
    
    console.log(`[chatMessageService.fetchMessages] Fetching messages for user: ${user.id}, class: ${classId}, mode: ${chatMode}, limit: ${limit}, before: ${beforeTimestamp || 'N/A'}`);

    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .eq('class_id', classId)
      .eq('chat_mode', chatMode)
      .order('created_at', { ascending: false }) // Fetch newest first for limit, then reverse for display
      .limit(limit);

    if (beforeTimestamp) {
      query = query.lt('created_at', beforeTimestamp);
    }

    const { data, error } = await query;

    if (error) {
      console.error("chatMessageService.fetchMessages: Error fetching messages:", error);
      throw error;
    }

    const appMessages: ChatMessageApp[] = (data || []).map((dbRow: ChatMessageDBRow) => ({
      id: dbRow.id,
      role: dbRow.role as 'user' | 'assistant' | 'system', // Type assertion
      content: dbRow.content,
      createdAt: new Date(dbRow.created_at),
    }));
    
    console.log(`[chatMessageService.fetchMessages] Fetched ${appMessages.length} messages.`);
    return appMessages.reverse(); // Reverse to show oldest first in chat UI
  },
  
  // Optional: Add a function to delete all messages for a class (e.g., if a class is deleted)
  // This would typically be called by a service_role key from an Edge Function or admin panel.
  // deleteMessagesForClass: async (classId: string, userId: string): Promise<void> => {
  //   console.log(`[chatMessageService.deleteMessagesForClass] Deleting all messages for class: ${classId}, user: ${userId}`);
  //   const { error } = await supabase
  //     .from('chat_messages')
  //     .delete()
  //     .eq('class_id', classId)
  //     .eq('user_id', userId);
  //   if (error) {
  //     console.error("chatMessageService.deleteMessagesForClass: Error deleting messages:", error);
  //     throw error;
  //   }
  //   console.log(`[chatMessageService.deleteMessagesForClass] Messages deleted for class: ${classId}`);
  // },
};
