// src/components/classes/ClassManagementPanel.tsx
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ClassConfig } from '@/services/classOpenAIConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Trash2 } from 'lucide-react';

interface ClassManagementPanelProps {
  selectedClass: ClassConfig;
  onRenameClass: (classId: string, newName: string) => Promise<void>;
  onDeleteClass: () => void;
}

export const ClassManagementPanel: React.FC<ClassManagementPanelProps> = ({
  selectedClass,
  onRenameClass,
  onDeleteClass,
}) => {
  const { toast } = useToast();
  const [newClassName, setNewClassName] = useState(selectedClass.class_name);
  const [isSavingName, setIsSavingName] = useState(false);

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || newClassName.trim() === selectedClass.class_name) return;
    setIsSavingName(true);
    try {
      await onRenameClass(selectedClass.class_id, newClassName.trim());
      toast({ title: "Success", description: "Class name has been updated." });
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
      setNewClassName(selectedClass.class_name);
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Management</CardTitle>
        <CardDescription>Rename or permanently delete this class.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleRenameSubmit} className="space-y-2">
          <Label htmlFor="class-name">Class Name</Label>
          <div className="flex items-center gap-2">
            <Input id="class-name" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
            <Button type="submit" disabled={isSavingName || newClassName === selectedClass.class_name}>
              <Save className="h-4 w-4 mr-2" />
              {isSavingName ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
        <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10 flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-destructive">Delete this Class</h4>
            <p className="text-xs text-destructive/80">This action is irreversible.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={onDeleteClass}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Class
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};