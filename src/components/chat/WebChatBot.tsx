// src/components/chat/WebChatBot.tsx
import { useState, useRef, useEffect } from "react";
import { Send, Globe, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Message { // This is ChatUIMessage in SuperTutor
  role: "user" | "assistant" | "system";
  content: string;
  // id?: string; // Keep this commented if not used
}

interface WebChatBotProps {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  suggestions?: string[];
  disableToasts?: boolean;
  loadingIndicator?: React.ReactNode;
  onResponseGenerationStateChange?: (isGenerating: boolean) => void;
  messages?: Message[]; 
  onMessagesChange?: (messagesOrUpdater: Message[] | ((prevMessages: Message[]) => Message[])) => void;
}

export function WebChatBot({
  title = "Web Search",
  subtitle = "Ask me to search the web",
  placeholder = "Search the web...",
  suggestions = [],
  disableToasts = false,
  loadingIndicator,
  onResponseGenerationStateChange,
  messages: externalMessages,
  onMessagesChange
}: WebChatBotProps) {
  const [internalMessages, setInternalMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messages = externalMessages !== undefined ? externalMessages : internalMessages;
  
  const setMessagesWrapper = (newMessagesOrFn: Message[] | ((prevMessages: Message[]) => Message[])) => {
    if (onMessagesChange) {
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

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;
    setErrorMessage(null);
    const userMessage: Message = { role: "user", content: messageText };
    
    const currentMessagesForAPI = externalMessages ? [...externalMessages] : [...internalMessages];
    setMessagesWrapper(prevMessages => [...prevMessages, userMessage]);
    setIsLoading(true);

    try {
      console.log("WebChatBot: Sending message:", messageText);
      const { data, error: functionError } = await supabase.functions.invoke("web-chat", {
        body: { message: messageText, history: currentMessagesForAPI }
      });

      if (functionError) throw new Error(`Service connection error: ${functionError.message}`);
      if (data.error) {
        setErrorMessage(data.error);
        const aiErrMsg: Message = { role: "assistant", content: `Sorry, an issue occurred: ${data.error}` };
        setMessagesWrapper(prev => [...prev, aiErrMsg]);
        if (!disableToasts) toast({ title: "AI Error", description: data.error, variant: "destructive" });
        return;
      }
      const aiMessage: Message = { role: "assistant", content: data.response };
      setMessagesWrapper(prev => [...prev, aiMessage]);
    } catch (error: unknown) {
      let friendlyMsg = "Failed to get response.";
      if (error instanceof Error) friendlyMsg = error.message.includes("Service connection") ? "Connection issue." : error.message;
      setErrorMessage(friendlyMsg);
      const aiErrMsg: Message = { role: "assistant", content: `Sorry, couldn't process: ${friendlyMsg}` };
      setMessagesWrapper(prev => [...prev, aiErrMsg]);
      if (!disableToasts) toast({ title: "Chat Error", description: friendlyMsg, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-4 sm:p-6 pb-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{title}</h2>
          <Badge variant="outline" className="flex items-center gap-1 border-blue-500 text-blue-700">
            <Globe className="h-3 w-3" /> <span className="text-xs">Web Search</span>
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex-1 h-0 overflow-hidden"> {/* Ensures ScrollArea has a bounded height */}
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <ChatMessage key={index} content={message.content} isUser={message.role === "user"} />
            ))}
            {errorMessage && !isLoading && (
              <Alert variant="destructive" className="my-2">
                <AlertCircle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            {isLoading && loadingIndicator}
            {messages.length === 0 && !isLoading && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">I can search the web for information for you.</p>
                {suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Try asking:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {suggestions.map((suggestion, i) => (
                        <Button key={i} variant="outline" size="sm" onClick={() => handleSendMessage(suggestion)} className="text-xs" disabled={isLoading}>
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

      <div className="p-4 border-t flex-shrink-0">
        <ChatInput onSend={handleSendMessage} isLoading={isLoading} placeholder={placeholder} />
      </div>
    </div>
  );
}
