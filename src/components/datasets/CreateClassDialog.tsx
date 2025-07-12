// src/components/datasets/CreateClassDialog.tsx
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
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';

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
      {/* 1. Increased the max-width to allow description to fit on two lines. */}
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          {/* 2. Applied text-center directly to Title and Description for better alignment control. */}
          <DialogHeader>
            <DialogTitle className="text-center">Create New Class</DialogTitle>
            <DialogDescription className="text-center pt-2">
              Classes are the top-level containers for your course materials. Give your new class a name to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-center gap-4">
              <Label htmlFor="name">
                Name
              </Label>
              <Input
                id="name"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-64"
                placeholder="e.g., ITP-216: Applied Python"
                disabled={isLoading}
                // 3. Added autoComplete="off" to prevent browser suggestions.
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading || !className.trim()}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Creating...' : 'Create Class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};