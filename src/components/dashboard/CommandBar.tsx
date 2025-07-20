// src/components/dashboard/CommandBar.tsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Terminal } from 'lucide-react';

interface CommandBarProps {
  command: string;
  setCommand: (value: string) => void;
  handleCommandSubmit: (e: React.FormEvent) => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({ command, setCommand, handleCommandSubmit }) => {
  return (
    <div className="rounded-lg border border-marble-400 overflow-hidden bg-white">
      <div className="p-4">
        <form onSubmit={handleCommandSubmit} className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-volcanic-800" />
          <Input
            type="text"
            placeholder="Enter a command..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="flex-grow bg-white border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button type="submit" variant="outline" size="sm">
            Run
          </Button>
        </form>
      </div>
    </div>
  );
};
