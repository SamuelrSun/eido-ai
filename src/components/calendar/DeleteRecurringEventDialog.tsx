// src/components/calendar/DeleteRecurringEventDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export type DeletionScope = 'this' | 'following' | 'all';

interface DeleteRecurringEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scope: DeletionScope) => void;
}

export const DeleteRecurringEventDialog: React.FC<DeleteRecurringEventDialogProps> = ({ isOpen, onClose, onConfirm }) => {
  const [scope, setScope] = useState<DeletionScope>('this');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete recurring event</DialogTitle>
          <DialogDescription>
            This is a recurring event. Choose which instances you want to delete.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup value={scope} onValueChange={(value) => setScope(value as DeletionScope)} className="my-4 space-y-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="this" id="delete-this" />
            <Label htmlFor="delete-this">This event</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="following" id="delete-following" />
            <Label htmlFor="delete-following">This and following events</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="delete-all" />
            <Label htmlFor="delete-all">All events</Label>
          </div>
        </RadioGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(scope)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};