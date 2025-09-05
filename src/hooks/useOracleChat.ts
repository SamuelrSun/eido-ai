// src/hooks/useOracleChat.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/supabase';

// --- MODIFICATION: Define a type for the data returned by our new RPC function ---
type LatestConversationResponse = Database['public']['Functions']['get_latest_conversation']['Returns'];

export interface MessageSource {
  file_id: string;
  file_name: string | null;
  page_number?: number | null;
}

export interface ChatMessage {
  id: string;
  created_at: string;
  message_text: string | null;
  sender: 'user' | 'ai';
  sources?: MessageSource[];
}

export const useOracleChat = (classId?: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialConversation = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // --- MODIFICATION: Explicitly type the response from the RPC call ---
      const { data, error } = await supabase.rpc('get_latest_conversation', {
          p_user_id: user.id,
          p_class_id: classId,
      });

      const typedData = data as LatestConversationResponse;

      if (error) {
        console.error('Error fetching latest conversation:', error);
        setMessages([]);
        setConversationId(null);
      } else if (typedData && typedData.length > 0) {
        setConversationId(typedData[0].conversation_id);
        
        const formattedMessages = typedData.map(msg => ({
            id: msg.message_id,
            created_at: msg.created_at,
            message_text: msg.message_text,
            sender: msg.sender as 'user' | 'ai',
            sources: msg.sources || [],
        }));
        setMessages(formattedMessages);
      } else {
        setMessages([]);
        setConversationId(null);
      }
      setIsLoading(false);
    };

    fetchInitialConversation();
  }, [classId]);

  const sendMessage = useCallback(async (text: string, currentClassId: string) => {
    if (!text.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("User not authenticated.");
      return;
    }

    let currentConvId = conversationId;

    if (!currentConvId) {
      const { data: newConvo, error: newConvoError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          class_id: currentClassId,
          chatbot_type: 'oracle',
          title: `Chat on ${new Date().toLocaleString()}`,
        })
        .select('id')
        .single();
      
      if (newConvoError || !newConvo) {
        console.error("Error creating new conversation:", newConvoError);
        return;
      }
      currentConvId = (newConvo as { id: string }).id;
      setConversationId(currentConvId);
      setMessages([]);
    }
    
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      created_at: new Date().toISOString(),
      message_text: text,
      sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data: responseData, error } = await supabase.functions.invoke('oracle-chat', {
        body: {
          message: text,
          class_id: currentClassId,
        },
      });

      if (error) throw error;
      
      const aiMessage: ChatMessage = {
        id: responseData.message_id,
        created_at: responseData.created_at,
        message_text: responseData.message_text,
        sender: 'ai',
        sources: responseData.sources,
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error("Error calling oracle-chat function:", error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        created_at: new Date().toISOString(),
        message_text: "Sorry, I encountered an error. Please try again.",
        sender: 'ai',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }

  }, [conversationId, classId]);

  return { messages, isLoading, sendMessage, conversationId };
};