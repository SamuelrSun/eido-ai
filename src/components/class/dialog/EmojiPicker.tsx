
import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EmojiPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (emoji: string) => void;
}

// Educational subject categories
const emojiCategories = {
  "STEM": [
    "⚛️", "🧪", "🧬", "🔭", "🧮", "📊", "📈", "🔢", "📐", "🔬", "🧠", "🤖", 
    "💻", "👨‍💻", "📱", "⚙️", "🔌", "🔋", "💾", "📡", "📕", "📚", "🔍", "📝", 
    "🧮", "🔄", "📏", "📊", "📑", "📒", "🧫", "🦠", "💉", "💊", "🫀", "🦴", 
    "🔭", "🔬", "⚗️", "🧲", "🔩", "⚖️", "🦾", "🔋", "💻"
  ],
  "Humanities": [
    "📚", "📝", "🏛️", "🧠", "🎨", "🎵", "🗣️", "🎭", "📜", "🖋️", "✍️", "📰",
    "📕", "📖", "📗", "📘", "📙", "🗂️", "🖼️", "🎨", "🎬", "🎤", "🎼", "🎧", "🎵", 
    "🗿", "🏺", "🗝️", "🖌️", "🧩", "🎪", "🎹", "🎲", "🎯", "🎮", "🎨", "🖍️", 
    "🏺", "🎭", "👑", "🏆", "🎖️", "📰", "📻", "🖥️", "🖨️"
  ],
  "Business & Economics": [
    "💼", "📈", "💰", "📊", "🧮", "📢", "👔", "📋", "💹", "💱", "💲", "💳", "💵", 
    "💴", "💶", "💷", "📉", "📑", "📁", "📅", "⌚", "🗓️", "📱", "🗄️", "📒", "🖋️",
    "📝", "📌", "📎", "📏", "📐", "📘", "📊", "📋", "📇", "🗃️", "📂", "🖇️", "🗂️", 
    "📮", "📭", "🏦", "🏧", "💸", "💰", "💎"
  ],
  "Languages & Communication": [
    "🗣️", "📝", "✍️", "🌍", "🔤", "🔡", "🔠", "🔣", "📰", "📑", "🗒️", "📔", "🖋️", 
    "✏️", "📖", "📚", "🔖", "🗯️", "💬", "🗨️", "✉️", "📧", "🎙️", "🎤", "📣", "📢", 
    "🔊", "📱", "📲", "📞", "📌", "🗞️", "🗞️", "📰"
  ],
  "Social Sciences": [
    "👥", "🧠", "🏺", "🗺️", "🏛️", "⚖️", "🕊️", "🌐", "🧮", "📊", "📈", "📉", "📋", 
    "📊", "🗂️", "📁", "📂", "🗃️", "📰", "📑", "📚", "💭", "🔍", "🧩", "🧿", "🌱", 
    "🌿", "🌎", "🌍", "🌏", "🏙️", "🏘️", "🏫", "🧑‍⚖️", "👨‍👩‍👧‍👦"
  ],
  "Arts & Physical Education": [
    "🎨", "🎭", "🎬", "🎧", "🎵", "🎼", "🎺", "🎸", "🎻", "🎹", "🏃", "⚽", "🏀", 
    "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🏓", "🏸", "🏒", "🏑", "🏏", "⛳", "🏹", 
    "🎣", "🥊", "🥋", "🎽", "🛹", "🎿", "🏂", "🏋️", "🤸", "🤺", "⛹️", "🤾", 
    "🏌️", "🏄", "🏊", "🤽", "🚣", "🧗", "🚵", "🚴", "🏆"
  ],
  "Symbols & Tools": [
    "🔍", "🔎", "📌", "📎", "🖇️", "📏", "📐", "✂️", "🖊️", "🖋️", "✒️", "🖌️", "🖍️", 
    "📝", "✏️", "📓", "📔", "📒", "📕", "📗", "📘", "📙", "📚", "📖", "🔖", "🗒️", 
    "🔗", "📋", "📊", "📈", "📉", "📇", "🗃️", "🗄️", "📂", "📁", "📰", "🗞️", "📊",
    "🔒", "🔑", "🗝️", "🔨", "🧰", "🧲", "🔧", "🔩", "⚙️"
  ]
};

export function EmojiPicker({ open, onOpenChange, onSelect }: EmojiPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("STEM");
  
  const handleEmojiClick = (emoji: string) => {
    onSelect(emoji);
  };
  
  const filteredEmojis = searchTerm ? 
    Object.values(emojiCategories).flat().filter(emoji => {
      // Simple search - just check if the emoji contains the search term
      return emoji.includes(searchTerm);
    }) :
    emojiCategories[selectedCategory as keyof typeof emojiCategories];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-center">Select Subject Emoji</DialogTitle>
        
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search emojis..." 
            className="pl-8" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {!searchTerm && (
          <Tabs defaultValue="STEM" value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="STEM">STEM</TabsTrigger>
              <TabsTrigger value="Humanities">Humanities</TabsTrigger>
              <TabsTrigger value="Social Sciences">Social</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        
        <ScrollArea className="h-[300px] pr-4">
          <div className="grid grid-cols-8 gap-2">
            {filteredEmojis.map((emoji, index) => (
              <Button 
                key={index} 
                variant="ghost" 
                className="h-9 w-9 p-0 hover:bg-accent"
                onClick={() => handleEmojiClick(emoji)}
              >
                <span className="text-xl">{emoji}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
