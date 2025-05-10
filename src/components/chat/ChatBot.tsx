
import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OpenAIConfig } from "@/services/classOpenAIConfig";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatBotProps {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  suggestions?: string[];
  knowledgeBase?: string;
  openAIConfig?: OpenAIConfig;
}

export function ChatBot({
  title = "AI Chat",
  subtitle = "Ask me anything",
  placeholder = "Send a message...",
  suggestions = [],
  knowledgeBase,
  openAIConfig
}: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    // Add user message to chat
    const userMessage: Message = { role: "user", content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      console.log("Using custom OpenAI config:", openAIConfig ? "Yes" : "No");
      
      // Call the Supabase Edge Function with the class-specific OpenAI configuration
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          message: messageText,
          history: messages,
          openAIConfig: openAIConfig,
          knowledgeBase: knowledgeBase
        }
      });

      if (error) throw error;

      // Add AI response to chat
      const aiMessage: Message = { role: "assistant", content: data.response };
      setMessages(prev => [...prev, aiMessage]);
      
      // Show toast if using custom class configuration
      if (data.usingCustomConfig) {
        toast({
          title: "Using Class-Specific AI",
          description: "This response was generated using this class's custom AI configuration.",
          duration: 3000
        });
      }

    } catch (error: any) {
      console.error("Error getting AI response:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get a response from AI.",
        variant: "destructive",
      });

      // Add error message to chat
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I couldn't process your request. Please try again later."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-h-[80vh]">
      <div className="pb-4 border-b">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            content={message.content}
            isUser={message.role === "user"}
          />
        ))}

        {messages.length === 0 && (
          <div className="p-4">
            <p className="text-sm text-center text-muted-foreground mb-4">
              I can help answer questions about {knowledgeBase || "various topics"}
            </p>
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-center font-medium">Try asking:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((suggestion, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendMessage(suggestion)}
                      className="text-xs"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="pt-4 border-t mt-auto">
        <ChatInput 
          onSend={handleSendMessage} 
          suggestions={[]} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
}
