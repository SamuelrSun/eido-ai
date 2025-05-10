
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import React from "react";

interface ClassInfoSectionProps {
  title: string;
  professor: string;
  classTime: string;
  classroom: string;
  emoji: string;
  onTitleChange: (value: string) => void;
  onProfessorChange: (value: string) => void;
  onClassTimeChange: (value: string) => void;
  onClassroomChange: (value: string) => void;
  onEmojiChange: (value: string) => void;
  onEmojiPickerOpen?: () => void;
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
  onEmojiChange,
  onEmojiPickerOpen
}: ClassInfoSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Class Information</h3>
      
      <div className="flex items-center gap-4">
        <div 
          className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-all"
          onClick={onEmojiPickerOpen}
        >
          <span className="text-4xl">{emoji || "📚"}</span>
        </div>
        
        <div className="flex-1 space-y-2">
          <Label htmlFor="class-title">Class Title *</Label>
          <Input 
            id="class-title" 
            value={title} 
            onChange={(e) => onTitleChange(e.target.value)} 
            placeholder="e.g., Introduction to Computer Science" 
            required
          />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="professor">Professor</Label>
          <Input 
            id="professor" 
            value={professor} 
            onChange={(e) => onProfessorChange(e.target.value)} 
            placeholder="e.g., Dr. Smith"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="class-time">Class Time</Label>
          <Input 
            id="class-time" 
            value={classTime} 
            onChange={(e) => onClassTimeChange(e.target.value)} 
            placeholder="e.g., Mon/Wed 2:00-3:30 PM"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="classroom">Classroom</Label>
        <Input 
          id="classroom" 
          value={classroom} 
          onChange={(e) => onClassroomChange(e.target.value)} 
          placeholder="e.g., Science Building, Room 301"
        />
      </div>
    </div>
  );
}
