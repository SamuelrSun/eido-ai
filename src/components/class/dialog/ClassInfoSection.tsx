
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClassInfoSectionProps {
  title: string;
  professor: string;
  classTime: string;
  classroom: string;
  emoji?: string;
  onTitleChange: (value: string) => void;
  onProfessorChange: (value: string) => void;
  onClassTimeChange: (value: string) => void;
  onClassroomChange: (value: string) => void;
  onEmojiChange?: (value: string) => void;
}

export function ClassInfoSection({
  title,
  professor,
  classTime,
  classroom,
  emoji,
  onTitleChange,
  onProfessorChange,
  onClassTimeChange,
  onClassroomChange,
  onEmojiChange
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
        <Label htmlFor="professor">Professor</Label>
        <Input 
          id="professor"
          placeholder="e.g., Dr. Jane Smith" 
          value={professor}
          onChange={(e) => onProfessorChange(e.target.value)}
        />
      </div>
      
      <div>
        <Label htmlFor="class-time">Class Time</Label>
        <Input 
          id="class-time"
          placeholder="e.g., MWF 10:00 AM - 11:30 AM" 
          value={classTime}
          onChange={(e) => onClassTimeChange(e.target.value)}
        />
      </div>
      
      <div>
        <Label htmlFor="classroom">Classroom</Label>
        <Input 
          id="classroom"
          placeholder="e.g., Science Building, Room 305" 
          value={classroom}
          onChange={(e) => onClassroomChange(e.target.value)}
        />
      </div>
      
      {/* We could add an emoji picker here in the future if needed */}
    </div>
  );
}
