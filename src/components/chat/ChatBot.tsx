// src/components/chat/ChatBot.tsx
import { useState, useRef, useEffect } from "react";
import { Bot, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { OpenAIConfig } from "@/services/classOpenAIConfig";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatBotProps {
  placeholder?: string;
  suggestions?: string[];
  knowledgeBase?: string; 
  openAIConfig?: OpenAIConfig; 
  classId?: string;
  disableToasts?: boolean;
  loadingIndicator?: React.ReactNode;
  onResponseGenerationStateChange?: (isGenerating: boolean) => void;
  messages?: Message[]; 
  onMessagesChange?: (messagesOrUpdater: Message[] | ((prevMessages: Message[]) => Message[])) => void;
  className?: string;
  disabled?: boolean; 
}

export function ChatBot({
  placeholder = "Ask about your class materials...",
  suggestions = [],
  knowledgeBase,
  openAIConfig,
  classId,
  disableToasts = false,
  loadingIndicator,
  onResponseGenerationStateChange,
  messages: externalMessages,
  onMessagesChange,
  className,
  disabled, 
}: ChatBotProps) {
  const [internalMessages, setInternalMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messages = externalMessages !== undefined ? externalMessages : internalMessages;
  
  const setMessagesWrapper = (newMessagesOrFn: Message[] | ((prevMessages: Message[]) => Message[])) => {
    const newMessages = typeof newMessagesOrFn === 'function'
      ? newMessagesOrFn(messages)
      : newMessagesOrFn;

    if (onMessagesChange) {
      onMessagesChange(newMessages);
    } else {
      setInternalMessages(newMessages);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    onResponseGenerationStateChange?.(isLoading);
  }, [isLoading, onResponseGenerationStateChange]);

  const handleSendMessage = async (messageText: string) => {
    if (disabled || !messageText.trim()) return;

    setErrorMessage(null);
    const userMessage: Message = { role: "user", content: messageText };

    // Create the new list of messages for the UI *now*
    const messagesWithUserQuery = [...messages, userMessage];
    
    // Update the UI immediately with the user's message
    setMessagesWrapper(messagesWithUserQuery); 
    setIsLoading(true);

    try {
      const { data, error: functionError } = await supabase.functions.invoke("chat", {
        body: {
          message: messageText,
          // Pass the history that *doesn't* include the current message,
          // as the 'message' param on the backend handles appending it.
          history: messages,
          openAIConfig: openAIConfig, 
          knowledgeBase: knowledgeBase,
          class_id: classId 
        }
      });

      if (functionError) throw new Error(`Service connection error: ${functionError.message}`);
      if (data.error) {
        setErrorMessage(data.error);
        const aiErrorMessage: Message = { role: "assistant", content: `Sorry, I encountered an issue: ${data.error}` };
        // When adding an error message, append it to the list that already has the user's query
        setMessagesWrapper([...messagesWithUserQuery, aiErrorMessage]);
        if (!disableToasts) toast({ title: "AI Response Error", description: data.error, variant: "destructive" });
        return;
      }
      const aiMessage: Message = { role: "assistant", content: data.response };

      // Append the AI response to the list that already contains the user's message
      setMessagesWrapper([...messagesWithUserQuery, aiMessage]);

    } catch (error: unknown) {
      let friendlyErrorMessage = "Failed to get a response. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("Service connection error")) friendlyErrorMessage = "Could not connect to the AI service.";
        else if (error.message.includes("Assistant run timed out")) friendlyErrorMessage = "The AI took too long to respond.";
        else friendlyErrorMessage = error.message;
      }
      setErrorMessage(friendlyErrorMessage);
      const aiErrorMessage: Message = { role: "assistant", content: `Sorry, I couldn't process your request. ${friendlyErrorMessage}` };
      // Also append to the list that has the user's query
      setMessagesWrapper([...messagesWithUserQuery, aiErrorMessage]);
      if (!disableToasts) toast({ title: "Chat Error", description: friendlyErrorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-1 h-0 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                content={message.content}
                isUser={message.role === "user"}
              />
            ))}

            {errorMessage && !isLoading && (
              <Alert variant="destructive" className="my-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {isLoading && loadingIndicator}

            {messages.length === 0 && !isLoading && (
              <div className="text-center py-4">
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
                          disabled={isLoading || disabled}
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
        </ScrollArea>
      </div>

      <div className="p-4 border-t mt-auto flex-shrink-0">
        <ChatInput
          onSend={handleSendMessage}
          isLoading={isLoading}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
