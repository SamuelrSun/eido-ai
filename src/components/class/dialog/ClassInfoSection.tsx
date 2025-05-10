
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ClassInfoSectionProps {
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export function ClassInfoSection({
  title,
  description,
  onTitleChange,
  onDescriptionChange
}: ClassInfoSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="class-title">Class Title</Label>
        <Input 
          id="class-title"
          placeholder="e.g., Introduction to Computer Science" 
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>
      
      <div>
        <Label htmlFor="class-description">Description (optional)</Label>
        <Textarea 
          id="class-description"
          placeholder="Describe what this class is about..." 
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>
    </div>
  );
}
