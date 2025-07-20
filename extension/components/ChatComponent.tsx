// extension/components/ChatComponent.tsx
import React from 'react';
import type { Session } from '@supabase/supabase-js';

export const ChatComponent = ({ session }: { session: Session }) => {
  // This is now a placeholder component.
  // It renders a blank container, which will appear as a white screen.
  // The header from the main App component will remain visible above this.
  // You can start building your chat UI here.
  return (
    <div className="container">
      {/* Intentionally blank for now */}
    </div>
  );
};
