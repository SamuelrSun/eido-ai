
import React, { useState } from "react";
import { 
  Input,
  Label,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

// Common emojis categorized by academic subjects
const subjectEmojis = {
  "Sciences": ["🧪", "⚗️", "🔬", "🧬", "⚛️", "🔭", "🌍", "🧮", "📊", "📈", "📉"],
  "Math": ["🧮", "📐", "📏", "🔢", "➗", "➕", "➖", "✖️", "π", "∑", "∞"],
  "Humanities": ["📚", "🏛️", "🎭", "🎨", "🖋️", "📝", "📜", "🗿", "🏺", "⚱️"],
  "Languages": ["🗣️", "🌐", "🇺🇸", "🇪🇸", "🇫🇷", "🇩🇪", "🇮🇹", "🇯🇵", "🇨🇳", "🇰🇷"],
  "Technology": ["💻", "🖥️", "📱", "⌨️", "🖱️", "🌐", "📡", "💾", "🤖", "⚙️", "🔌"],
  "Business": ["💼", "📊", "📈", "📉", "💰", "💱", "💹", "🏦", "🧾", "📑"],
  "Health": ["🩺", "💊", "💉", "🫀", "🧠", "🦴", "👁️", "🦷", "🧪", "🧬"],
  "Arts": ["🎨", "🖌️", "🎭", "🎬", "🎵", "🎹", "🎸", "🎺", "🎻", "🎤"],
  "Social Studies": ["🌎", "🗺️", "🏛️", "⚖️", "👨‍👩‍👧‍👦", "🏫", "🧩", "🔍", "📰"],
  "Physical Education": ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎯", "🏆", "🏅"],
  "Miscellaneous": ["📓", "📔", "📒", "📝", "📋", "📎", "✂️", "📐", "📏", "🔍", "💡", "🔔", "📆", "🕒", "🧩"]
};

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
  const [isEmojiPopoverOpen, setIsEmojiPopoverOpen] = useState(false);

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
      
      <div>
        <Label className="block mb-2">Class Emoji</Label>
        <div className="flex items-center gap-2">
          <div className="text-4xl w-12 h-12 flex items-center justify-center border rounded-md">
            {emoji || "📚"}
          </div>
          <Popover open={isEmojiPopoverOpen} onOpenChange={setIsEmojiPopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                type="button" 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Smile className="h-4 w-4" /> 
                Select Emoji
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-4 max-h-[300px] overflow-y-auto">
                {Object.entries(subjectEmojis).map(([category, emojis]) => (
                  <div key={category} className="mb-4">
                    <h4 className="font-medium text-sm mb-2 text-muted-foreground">{category}</h4>
                    <div className="flex flex-wrap gap-2">
                      {emojis.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          className={cn(
                            "w-8 h-8 flex items-center justify-center text-lg rounded hover:bg-accent",
                            "transition-colors cursor-pointer"
                          )}
                          onClick={() => {
                            onEmojiChange(emoji);
                            setIsEmojiPopoverOpen(false);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
