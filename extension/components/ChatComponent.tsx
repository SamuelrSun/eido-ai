// extension/components/ChatComponent.tsx
import React from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../src/integrations/supabase/client';

interface ChatComponentProps {
  session: Session;
  onSignOut: () => void;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({ session, onSignOut }) => {
  return (
    <div className="container" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' }}>
        You are logged in!
      </h2>
      <p style={{ color: '#4b5563' }}>
        Your session has been detected successfully.
      </p>
      <div style={{ background: '#f3f4f6', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <p style={{ fontSize: '0.875rem', color: '#374151', wordBreak: 'break-all' }}>
          <strong>Email:</strong> {session.user.email}
        </p>
      </div>
      <button 
        onClick={onSignOut}
        className="auth-button-primary" 
        style={{ maxWidth: '200px', marginTop: '16px' }}
      >
        Sign Out
      </button>
    </div>
  );
};
