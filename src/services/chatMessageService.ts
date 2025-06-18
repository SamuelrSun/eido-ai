// src/services/chatMessageService.ts
import { supabase } from "@/integrations/supabase/client";
import type { CustomDatabase } from "@/integrations/supabase/client";
import { AttachedFile } from "@/components/chat/AttachedFilePill"; // Import the specific type

export type ChatMessageDBRow = CustomDatabase['public']['Tables']['chat_messages']['Row'];
export type ChatMessageDBInsert = CustomDatabase['public']['Tables']['chat_messages']['Insert'];

export interface ActiveSource {
    number: number;
    name: string;
    url: string;
    content: string;
    highlight?: string;
    //page_number?: number; // ADDED
}

export interface ChatMessageApp {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  conversation_id: string;
  sources?: ActiveSource[];
  // Add the new property for attached files
  attached_files?: { name: string, type: string }[];
}

const mapToAppMessage = (dbRow: any): ChatMessageApp => ({
  id: dbRow.id,
  role: dbRow.role as 'user' | 'assistant' | 'system',
  content: dbRow.content,
  createdAt: new Date(dbRow.created_at),
  conversation_id: dbRow.conversation_id!,
  sources: (dbRow.message_sources || []).map((source: any) => ({
      number: source.source_number,
      name: source.name,
      url: source.url,
      content: source.content,
      highlight: source.highlight,
      //page_number: source.page_number // ADDED
  })).sort((a: ActiveSource, b: ActiveSource) => a.number - b.number),
  // Map the new field from the database (it might be null)
  attached_files: dbRow.attached_files || [],
});

export const chatMessageService = {
  saveMessage: async (
    messagePayload: Omit<ChatMessageDBInsert, 'user_id' | 'id' | 'created_at'> & { conversation_id: string; sources?: ActiveSource[], attached_files?: { name: string, type: string }[] }
  ): Promise<ChatMessageApp> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User must be authenticated to save messages.");
    }

    const { sources, ...messageData } = messagePayload;
    // The attached_files property is already part of messageData if it exists
    const messageToSave: ChatMessageDBInsert = { ...messageData, user_id: user.id };

    const { data: savedMessage, error } = await supabase
      .from('chat_messages')
      .insert(messageToSave)
      .select('*, message_sources(*)') // Re-select sources after insert if needed
      .single();

    if (error) {
      console.error("chatMessageService.saveMessage: Error saving message:", error);
      throw error;
    }

    if (sources && sources.length > 0 && savedMessage) {
        const sourcesToInsert = sources.map(source => ({
            message_id: savedMessage.id,
            source_number: source.number,
            name: source.name,
            url: source.url,
            content: source.content,
            highlight: source.highlight,
            //page_number: source.page_number // MODIFIED: Include page_number in insert payload
        }));

        const { error: sourcesError } = await supabase
            .from('message_sources')
            .insert(sourcesToInsert);
        
        if(sourcesError){
            console.error("chatMessageService.saveMessage: Error saving sources:", sourcesError);
        }
    }
    
    return { ...mapToAppMessage(savedMessage), sources: sources || [] };
  },

  fetchMessagesByConversation: async (conversationId: string): Promise<ChatMessageApp[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    if (!conversationId) return [];

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`*, message_sources(*)`)
      .eq('user_id', user.id)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("chatMessageService.fetchMessagesByConversation: Error fetching messages:", error);
      throw error;
    }

    return (data || []).map(mapToAppMessage);
  },
};