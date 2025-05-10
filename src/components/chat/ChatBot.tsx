
import { useState, useRef, useEffect } from "react";
import { Send, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OpenAIConfig } from "@/services/classOpenAIConfig";
import { Badge } from "@/components/ui/badge";

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
  const [activeVectorStore, setActiveVectorStore] = useState<string | null>(null);
  const [activeAssistant, setActiveAssistant] = useState<string | null>(null);
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
      if (openAIConfig) {
        console.log("Vector Store ID:", openAIConfig.vectorStoreId);
        console.log("Assistant ID:", openAIConfig.assistantId);
      }
      
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
      
      // Store the active vector store and assistant IDs for display
      setActiveVectorStore(data.vectorStoreId || null);
      setActiveAssistant(data.assistantId || null);
      
      // Show toast if using custom class configuration
      if (data.usingCustomConfig) {
        toast({
          title: "Using Class-Specific AI",
          description: `Response generated using ${knowledgeBase}'s custom AI configuration with Vector Store: ${data.vectorStoreId?.substring(0, 8)}...`,
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{title}</h2>
          
          {(activeVectorStore || openAIConfig?.vectorStoreId) && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              <span className="text-xs">Using Custom Knowledge Base</span>
            </Badge>
          )}
        </div>
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
            
            {openAIConfig?.vectorStoreId && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4 text-sm text-green-800">
                <p className="font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Using dedicated knowledge base
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Answers will be based on your class materials
                </p>
              </div>
            )}
            
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
