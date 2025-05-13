// src/components/chat/ChatInput.tsx
import { useState, FormEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  onSend: (message: string) => void;
  suggestions?: string[];
  isLoading?: boolean;
  placeholder?: string; // Added placeholder prop
}

export function ChatInput({
  onSend,
  suggestions = [], 
  isLoading = false,
  placeholder = "Type your message here..." // Added placeholder with a default
}: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input);
      setInput("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSend(suggestion);
  };

  return (
    <div className="mt-4">
      {/* This suggestions block was in your original ChatInput.tsx, keeping it. */}
      {suggestions.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-sm bg-white" // Style from your original
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder} // Use the placeholder prop here
          className="flex-grow"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          <SendHorizontal className="h-5 w-5 mr-1" />
          Send
        </Button>
      </form>
    </div>
  );
}
