// extension/components/OracleBubble.tsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

// Define the structure of a chat message
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const OracleBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the bottom when new messages are added
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  // Listen for auth state events forwarded by content.tsx
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail;
        setIsAuthenticated(Boolean(detail?.isAuthenticated));
      } catch {
        setIsAuthenticated(false);
      }
    };
    window.addEventListener('EIDO_AUTH_STATUS', handler as EventListener);

    // Also request initial auth status directly from background as a fallback
    (async () => {
      try {
        const res = await chrome.runtime.sendMessage({ type: 'REQUEST_AUTH_STATUS' });
        if (res && typeof res.isAuthenticated !== 'undefined') {
          setIsAuthenticated(Boolean(res.isAuthenticated));
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.warn('Eido AI Oracle: could not fetch initial auth status', err);
        setIsAuthenticated(false);
      }
    })();

    return () => {
      window.removeEventListener('EIDO_AUTH_STATUS', handler as EventListener);
    };
  }, []);

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
      const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' });
      if (!response || !response.token) {
        throw new Error('Authentication token not found.');
      }

      // 2. Set the session for the Supabase client
      await supabase.auth.setSession({
        access_token: response.token,
        refresh_token: '', // Not needed for function calls
      });

      // 3. Call the 'oracle' Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('oracle', {
        body: { messages: newMessages },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data?.message ?? 'No response.',
      };
      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
    } catch (error) {
      console.error('Error calling Oracle function:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      try {
        await supabase.auth.signOut(); // Clear the temporary session
      } catch (e) {
        // ignore sign-out errors
      }
    }
  };

  const toggleOpen = () => setIsOpen((s) => !s);

  const openSignIn = () => {
    // Open the dashboard where the user can sign in; background cookie watcher will detect auth changes.
    window.open('https://dashboard.eido-ai.com', '_blank');
    // Optionally notify background to re-check after a short delay (background already watches cookie changes).
  };

  // Closed bubble (icon)
  if (!isOpen) {
    return (
      <div className="eido-bubble-closed" onClick={toggleOpen} role="button" title="Open Eido Oracle">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="eido-bubble-icon" width="28" height="28" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 1-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 1 3.09-3.09L12 5.25l2.846.813a4.5 4.5 0 0 1 3.09 3.09L21.75 12l-2.846.813a4.5 4.5 0 0 1-3.09 3.09Z" />
        </svg>
      </div>
    );
  }

  // Open & not authenticated => show a lightweight sign-in prompt
  if (isAuthenticated === false) {
    return (
      <div className="eido-bubble-open" role="dialog" aria-label="Eido Oracle (signed out)">
        <div className="eido-chat-header">
          <h3>Eido Oracle</h3>
          <button onClick={toggleOpen} className="eido-close-button" aria-label="Close">×</button>
        </div>

        <div style={{ padding: 12 }}>
          <p style={{ marginBottom: 12, color: '#cbd5e1' }}>
            Please sign in to Eido to use the Oracle overlay.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="eido-send-button" onClick={openSignIn}>
              Sign in to dashboard
            </button>
            <button
              className="eido-send-button"
              onClick={() => {
                // request immediate auth status refresh from background
                try {
                  chrome.runtime.sendMessage({ type: 'REQUEST_AUTH_STATUS' });
                } catch (e) {
                  console.warn('Eido AI: Could not request auth status', e);
                }
              }}
            >
              Refresh status
            </button>
          </div>
          <p style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
            After signing in on the dashboard, this bubble will update automatically.
          </p>
        </div>
      </div>
    );
  }

  // Open & authenticated (or unknown but allow user to try) => full chat UI
  return (
    <div className="eido-bubble-open" role="dialog" aria-label="Eido Oracle">
      <div className="eido-chat-header">
        <h3>Eido Oracle</h3>
        <button onClick={toggleOpen} className="eido-close-button" aria-label="Close">×</button>
      </div>

      <div className="eido-chat-body" ref={chatBodyRef}>
        {messages.length === 0 ? (
          <div className="eido-chat-placeholder">Ask me anything.</div>
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
              <div></div>
              <div></div>
              <div></div>
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
          aria-label="Message"
        />
        <button type="submit" className="eido-send-button" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
};
