import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

// Define the structure of a chat message
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const OracleBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new messages are added
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Get the auth token from the background script
      const response = await chrome.runtime.sendMessage({ type: "GET_AUTH_TOKEN" });
      if (!response || !response.token) {
        throw new Error("Authentication token not found.");
      }
      
      // 2. Set the session for the Supabase client
      supabase.auth.setSession({
        access_token: response.token,
        refresh_token: '' // Not needed for function calls
      });

      // 3. Call the 'oracle' Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('oracle', {
        body: { messages: newMessages },
      });

      if (error) throw error;

      const assistantMessage: Message = { role: 'assistant', content: data.message };
      setMessages(prevMessages => [...prevMessages, assistantMessage]);

    } catch (error) {
      console.error("Error calling Oracle function:", error);
      const errorMessage: Message = { role: 'assistant', content: "Sorry, I encountered an error. Please try again." };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      supabase.auth.signOut(); // Clear the temporary session
    }
  };
  
  const toggleOpen = () => setIsOpen(!isOpen);

  if (!isOpen) {
    return (
      <div className="eido-bubble-closed" onClick={toggleOpen}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="eido-bubble-icon">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 1-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 1 3.09-3.09L12 5.25l2.846.813a4.5 4.5 0 0 1 3.09 3.09L21.75 12l-2.846.813a4.5 4.5 0 0 1-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.898 20.575 16.5 21.75l-.398-1.175a3.375 3.375 0 0 0-2.9-2.9L12 17.25l1.175-.398a3.375 3.375 0 0 0 2.9-2.9L17.25 12l.398 1.175a3.375 3.375 0 0 0 2.9 2.9L21.75 16.5l-1.175.398a3.375 3.375 0 0 0-2.9 2.9Z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="eido-bubble-open">
      <div className="eido-chat-header">
        <h3>Eido Oracle</h3>
        <button onClick={toggleOpen} className="eido-close-button">&times;</button>
      </div>
      <div className="eido-chat-body" ref={chatBodyRef}>
        {messages.length === 0 ? (
          <div className="eido-chat-placeholder">Ask me anything...</div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`eido-message eido-message-${msg.role}`}>
              <p>{msg.content}</p>
            </div>
          ))
        )}
        {isLoading && (
          <div className="eido-message eido-message-assistant">
             <div className="eido-loading-dots">
                <div></div><div></div><div></div>
            </div>
          </div>
        )}
      </div>
      <form className="eido-chat-footer" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="Type your message"
          className="eido-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button type="submit" className="eido-send-button" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
};