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
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  // id?: string; // Keep this commented if not used, or define if ChatMessageApp.id is passed
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
  messages?: Message[]; 
  onMessagesChange?: (messagesOrUpdater: Message[] | ((prevMessages: Message[]) => Message[])) => void;
}

export function ChatBot({
  title = "Class AI",
  subtitle = "Ask questions about your class materials",
  placeholder = "Ask about your class materials...",
  suggestions = [],
  knowledgeBase,
  openAIConfig,
  disableToasts = false,
  loadingIndicator,
  onResponseGenerationStateChange,
  messages: externalMessages, // These are ChatUIMessage[] from SuperTutor
  onMessagesChange
}: ChatBotProps) {
  // This internal state is used if messages/onMessagesChange are not provided (standalone mode)
  const [internalMessages, setInternalMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<"assistant" | "fallback" | "error" | "idle">("idle");
  const [currentAssistantId, setCurrentAssistantId] = useState<string | null>(null);
  const [currentVectorStoreId, setCurrentVectorStoreId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determine which messages array to use (externally controlled or internal)
  const messages = externalMessages !== undefined ? externalMessages : internalMessages;
  
  // Wrapper to call either external onMessagesChange or update internal state
  const setMessagesWrapper = (newMessagesOrFn: Message[] | ((prevMessages: Message[]) => Message[])) => {
    if (onMessagesChange) {
      // If onMessagesChange expects Message[], and newMessagesOrFn is a function,
      // we need to compute the new state based on the *current* external messages.
      if (typeof newMessagesOrFn === 'function' && externalMessages) {
        onMessagesChange(newMessagesOrFn(externalMessages));
      } else if (Array.isArray(newMessagesOrFn)) {
        onMessagesChange(newMessagesOrFn);
      }
    } else { 
      setInternalMessages(newMessagesOrFn);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for the scroll target
  const { toast } = useToast();

  // Effect to scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]); // Dependency array includes messages

  useEffect(() => {
    onResponseGenerationStateChange?.(isLoading);
  }, [isLoading, onResponseGenerationStateChange]);

  useEffect(() => {
    setCurrentAssistantId(openAIConfig?.assistantId || null);
    setCurrentVectorStoreId(openAIConfig?.vectorStoreId || null);
    if (openAIConfig?.assistantId && openAIConfig?.vectorStoreId) {
        setChatMode("assistant");
    } else if (openAIConfig?.assistantId) {
        setChatMode("assistant"); 
        console.warn("ChatBot: Assistant ID provided but Vector Store ID is missing. RAG might not function as expected.");
    } else {
        setChatMode("fallback");
    }
  }, [openAIConfig]);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    setErrorMessage(null);
    const userMessage: Message = { role: "user", content: messageText };

    // Use a functional update if relying on external state to avoid stale closures
    const currentMessagesForAPI = externalMessages ? [...externalMessages] : [...internalMessages];
    setMessagesWrapper(prevMessages => [...prevMessages, userMessage]); 
    
    setIsLoading(true);

    try {
      const { data, error: functionError } = await supabase.functions.invoke("chat", {
        body: {
          message: messageText,
          history: currentMessagesForAPI, // Send the state *before* adding the new user message for history
          openAIConfig: openAIConfig, 
          knowledgeBase: knowledgeBase 
        }
      });

      if (functionError) throw new Error(`Service connection error: ${functionError.message}`);
      if (data.error) {
        setErrorMessage(data.error);
        setChatMode("error");
        const aiErrorMessage: Message = { role: "assistant", content: `Sorry, I encountered an issue: ${data.error}` };
        setMessagesWrapper(prevMessages => [...prevMessages, aiErrorMessage]);
        if (!disableToasts) toast({ title: "AI Response Error", description: data.error, variant: "destructive" });
        return;
      }
      const aiMessage: Message = { role: "assistant", content: data.response };
      setMessagesWrapper(prevMessages => [...prevMessages, aiMessage]);

      setCurrentAssistantId(data.assistantId || null);
      setCurrentVectorStoreId(data.vectorStoreId || openAIConfig?.vectorStoreId || null);

      if (data.usedAssistant) setChatMode("assistant");
      else if (data.usedFallback) setChatMode("fallback");

    } catch (error: unknown) {
      let friendlyErrorMessage = "Failed to get a response. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("Service connection error")) friendlyErrorMessage = "Could not connect to the AI service.";
        else if (error.message.includes("Assistant run timed out")) friendlyErrorMessage = "The AI took too long to respond.";
        else friendlyErrorMessage = error.message;
      }
      setErrorMessage(friendlyErrorMessage);
      setChatMode("error");
      const aiErrorMessage: Message = { role: "assistant", content: `Sorry, I couldn't process your request. ${friendlyErrorMessage}` };
      setMessagesWrapper(prevMessages => [...prevMessages, aiErrorMessage]);
      if (!disableToasts) toast({ title: "Chat Error", description: friendlyErrorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 sm:p-6 pb-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{title}</h2>
          <div className="flex gap-2">
            {chatMode === "fallback" && (
              <Badge variant="outline" className="flex items-center gap-1 border-amber-500 text-amber-700">
                <AlertCircle className="h-3 w-3" />
                <span className="text-xs">General Knowledge</span>
              </Badge>
            )}
            {currentVectorStoreId && chatMode === "assistant" && ( 
                 <Badge variant="outline" className="flex items-center gap-1 border-blue-500 text-blue-700">
                    <DatabaseIcon className="h-3 w-3" />
                    <span className="text-xs">Database Search</span>
                 </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex-1 h-0 overflow-hidden"> {/* Ensures ScrollArea has a bounded height */}
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <ChatMessage
                key={index} // Consider using a unique message ID if available
                content={message.content}
                isUser={message.role === "user"}
              />
            ))}

            {errorMessage && chatMode === "error" && !isLoading && (
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
            {/* Empty div at the end of messages for scrolling into view */}
            <div ref={messagesEndRef} /> 
          </div>
        </ScrollArea>
      </div>

      <div className="p-4 border-t mt-auto flex-shrink-0">
        <ChatInput
          onSend={handleSendMessage}
          isLoading={isLoading}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
