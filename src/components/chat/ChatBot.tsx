// src/components/chat/ChatBot.tsx
import { useState, useRef, useEffect } from "react";
import { Send, Database as DatabaseIcon, Bot, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { OpenAIConfig } from "@/services/classOpenAIConfig";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area"; // Added import for ScrollArea

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
  disableToasts?: boolean;
  loadingIndicator?: React.ReactNode;
  onResponseGenerationStateChange?: (isGenerating: boolean) => void;
}

export function ChatBot({
  title = "AI Chat",
  subtitle = "Ask me anything",
  placeholder = "Send a message...", // This prop will be passed to ChatInput
  suggestions = [],
  knowledgeBase,
  openAIConfig,
  disableToasts = false,
  loadingIndicator,
  onResponseGenerationStateChange
}: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<"assistant" | "fallback" | "error" | "idle">("idle");
  const [currentAssistantId, setCurrentAssistantId] = useState<string | null>(null);
  const [currentVectorStoreId, setCurrentVectorStoreId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    onResponseGenerationStateChange?.(isLoading);
  }, [isLoading, onResponseGenerationStateChange]);

  useEffect(() => {
    setCurrentAssistantId(openAIConfig?.assistantId || null);
    setCurrentVectorStoreId(openAIConfig?.vectorStoreId || null);
    if (openAIConfig?.assistantId) {
        setChatMode("idle");
    } else {
        setChatMode("fallback");
    }
  }, [openAIConfig]);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    setErrorMessage(null);
    const userMessage: Message = { role: "user", content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setChatMode("idle");

    try {
      console.log("ChatBot: Sending message. Using OpenAIConfig:", openAIConfig);
      const { data, error: functionError } = await supabase.functions.invoke("chat", {
        body: {
          message: messageText,
          history: messages,
          openAIConfig: openAIConfig,
          knowledgeBase: knowledgeBase
        }
      });

      if (functionError) {
        console.error("ChatBot: Edge function invocation error:", functionError);
        throw new Error(`Service connection error: ${functionError.message}`);
      }

      if (data.error) {
        console.error("ChatBot: API response error from Edge Function:", data.error);
        setErrorMessage(data.error);
        setChatMode("error");
        const aiErrorMessage: Message = { role: "assistant", content: `Sorry, I encountered an issue: ${data.error}` };
        setMessages(prev => [...prev, aiErrorMessage]);
        if (!disableToasts) {
            toast({ title: "AI Response Error", description: data.error, variant: "destructive" });
        }
        return;
      }

      const aiMessage: Message = { role: "assistant", content: data.response };
      setMessages(prev => [...prev, aiMessage]);

      setCurrentAssistantId(data.assistantId || null);
      setCurrentVectorStoreId(data.vectorStoreId || null);

      if (data.usedAssistant) {
        setChatMode("assistant");
      } else if (data.usedFallback) {
        setChatMode("fallback");
      }

    } catch (error: unknown) {
      let friendlyErrorMessage = "Failed to get a response. Please try again.";
      if (error instanceof Error) {
        console.error("ChatBot: Error getting AI response:", error.message);
        if (error.message.includes("Service connection error")) {
            friendlyErrorMessage = "Could not connect to the AI service. Please check your internet connection.";
        } else if (error.message.includes("Assistant run timed out")) {
            friendlyErrorMessage = "The AI took too long to respond. Please try again.";
        } else {
            friendlyErrorMessage = error.message;
        }
      } else {
        console.error("ChatBot: Unknown error getting AI response:", error);
      }
      setErrorMessage(friendlyErrorMessage);
      setChatMode("error");
      const aiErrorMessage: Message = { role: "assistant", content: `Sorry, I couldn't process your request. ${friendlyErrorMessage}` };
      setMessages(prev => [...prev, aiErrorMessage]);
      if (!disableToasts) {
        toast({ title: "Chat Error", description: friendlyErrorMessage, variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-250px)] max-h-[700px] min-h-[400px]">
      <div className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{title}</h2>
          <div className="flex gap-2">
            {chatMode === "assistant" && currentAssistantId && (
              <Badge variant="default" className="flex items-center gap-1 bg-blue-500 text-white">
                <Bot className="h-3 w-3" />
                <span className="text-xs">Using Assistant</span>
              </Badge>
            )}
            {chatMode === "fallback" && (
              <Badge variant="outline" className="flex items-center gap-1 border-amber-500 text-amber-700">
                <AlertCircle className="h-3 w-3" />
                <span className="text-xs">General Knowledge</span>
              </Badge>
            )}
            {currentVectorStoreId && (
                 <Badge variant="outline" className="flex items-center gap-1">
                    <DatabaseIcon className="h-3 w-3" />
                    <span className="text-xs">VS: ...{currentVectorStoreId.slice(-6)}</span>
                 </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <ScrollArea className="flex-1 py-4 space-y-4">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            content={message.content}
            isUser={message.role === "user"}
          />
        ))}

        {errorMessage && chatMode === "error" && !isLoading && (
          <Alert variant="destructive" className="mx-4 my-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {isLoading && loadingIndicator}

        {messages.length === 0 && !isLoading && (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {knowledgeBase ? `I can help answer questions about ${knowledgeBase}.` : "How can I help you today?"}
            </p>
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Try asking:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((suggestion, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendMessage(suggestion)}
                      className="text-xs"
                      disabled={isLoading}
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
      </ScrollArea>

      <div className="pt-4 border-t mt-auto">
        <ChatInput
          onSend={handleSendMessage}
          isLoading={isLoading}
          placeholder={placeholder} // placeholder prop is passed here
        />
      </div>
    </div>
  );
}