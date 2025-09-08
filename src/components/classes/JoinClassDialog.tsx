// src/components/classes/JoinClassDialog.tsx
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from 'lucide-react';
import ShimmerButton from '../ui/ShimmerButton';

interface JoinClassDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (inviteCode: string) => void;
  isLoading: boolean;
}

export const JoinClassDialog: React.FC<JoinClassDialogProps> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [inviteCode, setInviteCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim()) {
      onSubmit(inviteCode.trim());
    }
  };

  // Reset input when dialog is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setInviteCode('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-neutral-900 border-neutral-800">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-white">Join a Class</DialogTitle>
            <DialogDescription className="pt-2 text-neutral-400">
              Enter the unique invite code provided by the class owner to get access to shared files and resources.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8">
            <Input
              id="invite-code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Paste invite code here..."
              disabled={isLoading}
              autoComplete="off"
              className="w-full bg-transparent border-0 border-b-2 border-neutral-700 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-blue-500 h-10 text-base text-white"
              autoFocus
            />
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white">Cancel</Button>
            <ShimmerButton type="submit" disabled={isLoading || !inviteCode.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Joining...' : 'Join Class'}
            </ShimmerButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};