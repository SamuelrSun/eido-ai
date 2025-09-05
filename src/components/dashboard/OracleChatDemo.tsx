// src/components/dashboard/OracleChatDemo.tsx
import React, { useState, useEffect } from 'react';
import { useOracleChat } from '@/hooks/useOracleChat';
import { ChatConversation } from '@/components/oracle/ChatConversation';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '../ui/skeleton';

export const OracleChatDemo = () => {
    // We need a classId to initialize or create a conversation.
    // For this demo, let's fetch the user's most recently used class.
    const [recentClassId, setRecentClassId] = useState<string | undefined>(undefined);
    const { messages, isLoading, sendMessage } = useOracleChat(recentClassId);

    useEffect(() => {
        const fetchRecentClass = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Find the most recently updated class the user is a member of.
            const { data, error } = await supabase
                .from('classes')
                .select('class_id')
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();
            
            if (error) {
                console.error("Could not fetch a recent class to display chat demo.", error);
            } else if (data) {
                setRecentClassId(data.class_id);
            }
        };
        fetchRecentClass();
    }, []);

    const handleSendMessage = (text: string) => {
        if (!recentClassId) {
            alert("Please go to a class to start a conversation.");
            return;
        }
        sendMessage(text, recentClassId);
    };

    // Show a loading skeleton while we find the most recent class
    if (recentClassId === undefined) {
        return <Skeleton className="h-full w-full" />;
    }

    return (
        <ChatConversation 
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
        />
    );
};