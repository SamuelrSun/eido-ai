
import { useState, useRef, useEffect } from "react";
import { Send, Database, Bot } from "lucide-react";
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
  const [usedVectorStore, setUsedVectorStore] = useState(false);
  const [usedAssistant, setUsedAssistant] = useState(false);
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
        console.log("API Key provided:", openAIConfig.apiKey ? "Yes" : "No");
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

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (data.error) {
        console.error("API response error:", data.error);
        throw new Error(data.error);
      }

      // Add AI response to chat
      const aiMessage: Message = { role: "assistant", content: data.response };
      setMessages(prev => [...prev, aiMessage]);
      
      // Store the active vector store and assistant IDs for display
      setActiveVectorStore(data.vectorStoreId || null);
      setActiveAssistant(data.assistantId || null);
      setUsedVectorStore(data.usedVectorStore || false);
      setUsedAssistant(data.usedAssistant || false);
      
      // Show appropriate toast based on what was used
      if (data.usedVectorStore) {
        toast({
          title: "Using Class Knowledge Base",
          description: `Response generated using the vector store (${data.vectorStoreId?.substring(0, 8)}...) for ${knowledgeBase}`,
          duration: 3000
        });
      } else if (data.usedAssistant) {
        toast({
          title: "Using Class Assistant",
          description: `Response generated using the custom assistant (${data.assistantId?.substring(0, 8)}...) for ${knowledgeBase}`,
          duration: 3000
        });
      } else if (data.usedFallback && (data.vectorStoreId || data.assistantId)) {
        toast({
          title: "Using Fallback Mode",
          description: `Unable to access custom knowledge base or assistant. Using general model instead.`,
          variant: "destructive",
          duration: 5000
        });
      }

    } catch (error: any) {
      console.error("Error getting AI response:", error);
      
      let errorMessage = "Failed to get a response from AI.";
      
      // Provide more user-friendly error messages based on common issues
      if (error.message?.includes("Invalid OpenAI API key") || 
          error.message?.includes("Authentication error")) {
        errorMessage = "Invalid OpenAI API key. Please check your class settings and update the API key.";
      } else if (error.message?.includes("OpenAI API key not provided")) {
        errorMessage = "No OpenAI API key found. Please add an API key in your class settings.";
      } else if (error.message?.includes("rate limit")) {
        errorMessage = "OpenAI API rate limit exceeded. Please try again in a few minutes.";
      } else if (error.message?.includes("Edge function")) {
        errorMessage = "Connection issue with the AI service. Please check your internet connection and try again.";
      } else if (error.message?.includes("vector store")) {
        errorMessage = "Failed to connect to your class knowledge base. Using general knowledge instead.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });

      // Add error message to chat
      const errorMessageContent: Message = {
        role: "assistant",
        content: `Sorry, I couldn't process your request. ${errorMessage}`
      };
      setMessages(prev => [...prev, errorMessageContent]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-h-[80vh]">
      <div className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{title}</h2>
          
          <div className="flex gap-2">
            {activeVectorStore && (
              <Badge variant={usedVectorStore ? "default" : "outline"} className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                <span className="text-xs">{usedVectorStore ? "Using" : "Has"} Knowledge Base</span>
              </Badge>
            )}
            
            {activeAssistant && (
              <Badge variant={usedAssistant ? "default" : "outline"} className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                <span className="text-xs">{usedAssistant ? "Using" : "Has"} Assistant</span>
              </Badge>
            )}
          </div>
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
            
            {!openAIConfig?.apiKey && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 text-sm text-amber-800">
                <p className="font-medium">No OpenAI API key configured</p>
                <p className="text-xs text-amber-700 mt-1">
                  Please add an API key in your class settings for this feature to work
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
