// src/components/SuperTutor/ClassTutorView.tsx
import React, { useState, useEffect } from 'react';
import ConversationSidebar, { Conversation } from '@/components/SuperTutor/ConversationSidebar';
import ChatMessages from '@/components/Chat/ChatMessages';
import ChatInput from '@/components/Chat/ChatInput';
import ClassTutorControls from './ClassTutorControls'; // Assuming path from repomix
import { useSuperTutorStore } from '@/store/superTutorStore'; // For selectedClass, etc.

// Define props for ClassTutorView to accept conversation related data and handlers
interface ClassTutorViewProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  isLoadingConversations: boolean;
  onSelectConversation: (id: string) => void;
  onCreateNewConversation: () => void;
  onRenameConversation: (id: string, newName: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
}

// Define a simple Message type for mock data (replace with your actual Message type)
interface MockMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp?: string;
}


const ClassTutorView: React.FC<ClassTutorViewProps> = ({
  conversations,
  selectedConversationId,
  isLoadingConversations,
  onSelectConversation,
  onCreateNewConversation,
  onRenameConversation,
  onDeleteConversation,
}) => {
  // Local state for messages, input, and sending status.
  // This will eventually be tied to the selectedConversationId and managed by Zustand/Supabase.
  const [chatMessages, setChatMessages] = useState<MockMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { selectedClass } = useSuperTutorStore(state => ({ selectedClass: state.selectedClass }));


  // Effect to mock fetching messages when selectedConversationId changes
  useEffect(() => {
    if (selectedConversationId) {
      console.log(`ClassTutorView: Fetching messages for conversation ${selectedConversationId}`);
      // Simulate fetching messages for the selected conversation
      setIsSending(true); // Use isSending to show loading for messages
      setTimeout(() => {
        // Mock messages based on conversation ID
        const mockMsgs: MockMessage[] = [
          { id: 'msg1-' + selectedConversationId, text: `Welcome to ${conversations.find(c=>c.id === selectedConversationId)?.name || 'this chat'}! How can I help with ${selectedClass?.class_title || 'your class'}?`, sender: 'ai', timestamp: new Date().toISOString() },
        ];
        setChatMessages(mockMsgs);
        setIsSending(false);
      }, 300);
    } else {
      setChatMessages([]); // Clear messages if no conversation is selected
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, selectedClass]); // Also depends on selectedClass for context in mock

  const handleSendMessage = async (messageContent: string) => {
    if (!selectedConversationId) {
      alert("Please select or create a conversation first."); // User-friendly message
      return;
    }
    if (!messageContent.trim()) return;

    setIsSending(true);
    const userMessage: MockMessage = {
      id: `user-${Date.now()}`,
      text: messageContent,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    setInput(''); // Clear input immediately

    // Simulate AI response
    // In a real app, this would be an API call to your backend/LLM
    // using selectedConversationId, messageContent, selectedClass context, etc.
    console.log(`ClassTutorView: Sending message "${messageContent}" to conversation ${selectedConversationId} for class ${selectedClass?.class_id}`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

    const aiResponse: MockMessage = {
      id: `ai-${Date.now()}`,
      text: `AI response to: "${messageContent}" (for ${selectedClass?.class_title || 'class'})`,
      sender: 'ai',
      timestamp: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, aiResponse]);
    setIsSending(false);
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden" data-testid="class-tutor-view">
      <ConversationSidebar
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={onSelectConversation}
        onCreateNewConversation={onCreateNewConversation}
        onRenameConversation={onRenameConversation}
        onDeleteConversation={onDeleteConversation}
        isLoading={isLoadingConversations}
        className="h-full flex-shrink-0" // Ensure sidebar doesn't shrink unexpectedly
      />
      <div className="flex flex-col flex-1 h-full overflow-hidden bg-gray-800"> {/* Main content area */}
        <ClassTutorControls /> {/* Controls specific to Class Tutor */}
        
        <div className="flex-1 flex flex-col overflow-y-auto relative px-4 pt-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"> {/* Chat messages area */}
          {selectedConversationId ? (
            <ChatMessages messages={chatMessages} isLoading={isSending && chatMessages.length === 0} /> // Show loading only if messages are empty
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p className="text-center">
                Select a conversation from the left panel <br /> or create a new one to begin.
              </p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-700 bg-gray-800"> {/* Chat input area */}
          <ChatInput
            input={input}
            setInput={setInput}
            handleSubmit={handleSendMessage}
            isLoading={isSending} // Loading state for when a message is being sent/received
            placeholder={selectedConversationId ? `Ask about ${selectedClass?.class_title || 'your class'}...` : "Select or create a chat to begin"}
            disabled={!selectedConversationId || isSending} 
          />
        </div>
      </div>
    </div>
  );
};

export default ClassTutorView;
