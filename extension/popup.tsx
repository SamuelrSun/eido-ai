// extension/popup.tsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { supabase } from '../src/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { AuthComponent } from './components/AuthComponent';
import { ChatComponent } from './components/ChatComponent';

// --- STYLES ---
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Inter:wght@400;500;600&display=swap');

  :root {
    --background: #f9fafb;
    --foreground: #1f2937;
    --primary: #4f46e5;
    --primary-foreground: #ffffff;
    --border: #e5e7eb;
    --input-border: #D1D5DB;
    --auth-bg: #FDFCF9;
    --auth-card-bg: #FFFFFF;
    --auth-title: #111827;
    --auth-subtitle: #4B5563;
    --auth-button-primary-bg: #1F2937;
    --auth-button-primary-text: #FFFFFF;
    --auth-button-google-bg: #F3F4F6;
    --auth-button-google-text: #374151;
    --auth-separator-text: #9CA3AF;
  }

  body {
    background-color: var(--background);
    color: var(--foreground);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }

  /* Main App Structure */
  .app-container { display: flex; flex-direction: column; height: 100vh; }
  .app-header { display: flex; align-items: center; gap: 8px; padding: 8px; background-color: #f3f4f6; border-bottom: 1px solid var(--border); user-select: none; }
  .app-header-title { font-weight: 600; font-size: 14px; flex-grow: 1; text-align: center; }
  .close-button { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; line-height: 1; color: #6b7280; }
  .close-button:hover { background-color: var(--border); }
  .main-content { flex-grow: 1; overflow: hidden; display: flex; flex-direction: column; }

  /* Auth Page Styles */
  .auth-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    background-color: var(--auth-bg);
    padding: 24px;
    box-sizing: border-box;
  }
  .auth-content { width: 100%; max-width: 320px; text-align: center; }
  .auth-title {
    font-family: 'Lora', serif;
    font-size: 2.25rem;
    font-weight: 700;
    color: var(--auth-title);
    margin: 0 0 8px 0;
  }
  .auth-subtitle {
    font-size: 0.875rem;
    color: var(--auth-subtitle);
    margin-bottom: 24px;
  }
  .auth-actions { display: flex; flex-direction: column; gap: 16px; }
  
  .auth-button-google {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 44px;
    padding: 0 16px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background-color: var(--auth-button-google-bg);
    color: var(--auth-button-google-text);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  .auth-button-google:hover { background-color: #E5E7EB; }
  .auth-button-google:disabled { opacity: 0.7; cursor: not-allowed; }

  .auth-separator { display: flex; align-items: center; gap: 8px; }
  .auth-separator-line { flex-grow: 1; height: 1px; background-color: var(--border); }
  .auth-separator-text { font-size: 0.75rem; color: var(--auth-separator-text); }

  .auth-form { display: flex; flex-direction: column; gap: 16px; }
  .auth-input-wrapper {
    position: relative;
    text-align: left;
    border: 1px solid var(--input-border);
    border-radius: 6px;
    padding: 6px 12px;
    transition: border-color 0.2s;
  }
  .auth-input-wrapper:focus-within { border-color: var(--auth-button-primary-bg); }
  .auth-input-wrapper label {
    display: block;
    font-size: 0.625rem;
    font-weight: 500;
    color: var(--auth-subtitle);
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .auth-input-wrapper input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    padding: 0;
    font-size: 0.875rem;
    color: var(--auth-title);
  }
  .auth-password-toggle {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: #9CA3AF;
  }
  .auth-password-toggle:hover { color: #4B5563; }

  .auth-forgot-password {
    align-self: flex-end;
    font-size: 0.75rem;
    color: var(--auth-title);
    text-decoration: none;
    margin-top: -8px;
  }
  .auth-forgot-password:hover { text-decoration: underline; }

  .auth-button-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 44px;
    border: none;
    border-radius: 6px;
    background-color: var(--auth-button-primary-bg);
    color: var(--auth-button-primary-text);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  .auth-button-primary:hover { background-color: #374151; }
  .auth-button-primary:disabled { background-color: #4B5563; cursor: not-allowed; }

  .auth-error { color: #EF4444; font-size: 0.75rem; text-align: center; margin-top: 12px; }

  /* Chat Component Styles (placeholders) */
  .container { display: flex; flex-direction: column; height: 100%; padding: 16px; box-sizing: border-box; }
  .chat-area { flex-grow: 1; overflow-y: auto; margin-bottom: 16px; }
  .message { padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; max-width: 80%; word-wrap: break-word; }
  .user-message { background-color: var(--primary); color: var(--primary-foreground); align-self: flex-end; }
  .ai-message { background-color: #e5e7eb; color: #374151; align-self: flex-start; }
  .input-area { display: flex; gap: 8px; }
  .input { flex-grow: 1; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background-color: var(--input); }
  .button { padding: 8px 16px; border: none; background-color: var(--primary); color: var(--primary-foreground); border-radius: 6px; cursor: pointer; }
  .button:disabled { background-color: #a5b4fc; cursor: not-allowed; }
  .loading-indicator { text-align: center; color: #6b7280; padding: 12px; }

  /* Spinners */
  .spinner, .spinner-small {
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  .spinner { width: 20px; height: 20px; border-top-color: #fff; }
  .spinner-small { width: 16px; height: 16px; border-top-color: #4B5563; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;

// --- MAIN APP ---
const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogin = (newSession: Session) => {
    setSession(newSession);
  };

  const handleClose = () => {
    window.parent.postMessage({ type: 'closeEidoPopup' }, '*');
  };

  return (
    <div className="app-container">
        <style>{styles}</style>
        <header className="app-header">
            <button onClick={handleClose} className="close-button" aria-label="Close">
                &#10005;
            </button>
            <div className="app-header-title">Eido AI Oracle</div>
        </header>
        <main className="main-content">
            {loading ? (
                <div className="loading-indicator">Loading...</div>
            ) : session ? (
                <ChatComponent session={session} />
            ) : (
                <AuthComponent onLogin={handleLogin} />
            )}
        </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
