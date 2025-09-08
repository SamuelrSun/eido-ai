// src/components/classes/CreateClassDialog.tsx
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

interface CreateClassDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (className: string) => void;
  isLoading: boolean;
}

export const CreateClassDialog: React.FC<CreateClassDialogProps> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [className, setClassName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (className.trim()) {
      onSubmit(className.trim());
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-neutral-900 border-neutral-800">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-white">Create New Class</DialogTitle>
            <DialogDescription className="pt-2 text-neutral-400">
              Classes are the top-level containers for your course materials. Give your new class a name to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8">
            <Input
              id="name"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full bg-transparent border-0 border-b-2 border-neutral-700 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-blue-500 h-10 text-base text-white"
              placeholder="Name your class here..."
              disabled={isLoading}
              autoComplete="off"
              autoFocus
            />
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white">Cancel</Button>
            <ShimmerButton type="submit" disabled={isLoading || !className.trim()}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Creating...' : 'Create Class'}
            </ShimmerButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};