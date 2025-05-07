
import { useState, useRef, useEffect } from "react";
import { RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from 'react-router-dom';

interface Message {
  content: string;
  isUser: boolean;
  timestamp: string;
  role?: string;
}

interface ChatBotProps {
  initialMessages?: Message[];
  suggestions?: string[];
  title?: string;
  showHeader?: boolean;
  knowledgeBase?: string;
}

export function ChatBot({ initialMessages = [], suggestions = [], title = "Chat with CyberCoach AI", showHeader = true, knowledgeBase }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingKnowledgeBase, setIsSearchingKnowledgeBase] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const location = useLocation();
  
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Add effect to copy the latest AI response to clipboard
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && !lastMessage.isUser && !isLoading) {
      navigator.clipboard.writeText(lastMessage.content)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
        });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (content: string) => {
    if (content.trim() === "") return;
    
    // Add user message
    const userMessage: Message = {
      content,
      isUser: true,
      role: "user",
      timestamp: new Date().toLocaleTimeString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsSearchingKnowledgeBase(true);
    
    try {
      // Always get the session regardless of the route
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      // Log the current path and auth status
      console.log("Current path:", location.pathname);
      console.log("Is authenticated:", accessToken ? "Yes" : "No");
      
      // Prepare messages array for the API
      const apiMessages = messages.map(msg => ({
        role: msg.role || (msg.isUser ? "user" : "assistant"),
        content: msg.content
      }));
      
      // Add the new user message
      apiMessages.push({ role: "user", content });

      console.log("Sending request to chat function with", apiMessages.length, "messages");
      
      // Headers for the request
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      
      // Always add auth header if available
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      } else {
        console.log("No auth token available, proceeding without authorization header");
      }
      
      // Call our edge function that proxies to OpenAI API
      const response = await fetch(`https://dbldoxurkcpbtdswcbkc.supabase.co/functions/v1/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: apiMessages,
          knowledgeBase,
          path: location.pathname
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("HTTP error:", response.status, errorText);
        throw new Error(`HTTP error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Received response:", data);
      
      // Check if there was an error returned from our edge function
      if (data.error) {
        console.error("Edge function error:", data.error);
        throw new Error(data.error);
      }
      
      // Get content from the response - handle both standard OpenAI format and our custom error format
      let aiMessageContent = "Sorry, I couldn't generate a response at the moment.";
      
      // Check if we have choices available
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        aiMessageContent = data.choices[0].message.content || aiMessageContent;
      }
      
      const aiMessage: Message = {
        content: aiMessageContent,
        isUser: false,
        role: "assistant",
        timestamp: new Date().toLocaleTimeString(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      
      const errorMessage: Message = {
        content: `Error: ${error instanceof Error ? error.message : "Failed to get response from AI"}`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response from AI",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsSearchingKnowledgeBase(false);
    }
  };
  
  const resetChat = () => {
    setMessages([]);
    toast({
      title: "Chat Reset",
      description: "Your conversation history has been cleared.",
    });
  };

  const copyLastAIMessage = () => {
    // Find the last AI message
    const lastAIMessage = [...messages].reverse().find(msg => !msg.isUser);
    
    if (lastAIMessage) {
      navigator.clipboard.writeText(lastAIMessage.content)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
          
          toast({
            title: "Copied to clipboard",
            description: "The AI response has been copied to your clipboard.",
          });
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          
          toast({
            title: "Copy failed",
            description: "Failed to copy text to clipboard.",
            variant: "destructive",
          });
        });
    }
  };

  return (
    <Card className="h-full flex flex-col w-screen mx-[-1.5rem]">
      {showHeader && (
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <h3 className="font-semibold text-lg">{title}</h3>
          {knowledgeBase && (
            <div className="px-3 py-1 text-xs bg-cybercoach-teal-light/20 text-cybercoach-teal-dark rounded-full">
              {knowledgeBase}
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={resetChat}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </CardHeader>
      )}
      
      <CardContent className="flex-grow flex flex-col pt-4">
        {/* Input at the top */}
        <div className="mb-4">
          <ChatInput 
            onSend={handleSendMessage} 
            suggestions={suggestions}
            isLoading={isLoading}
          />
        </div>
        
        <div 
          className="flex-grow overflow-y-auto mb-4 space-y-4"
          ref={chatContainerRef}
          style={{ maxHeight: "400px" }}
        >
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">
                No messages yet. Start a conversation!
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                key={index}
                content={message.content}
                isUser={message.isUser}
                timestamp={message.timestamp}
                onCopy={!message.isUser ? copyLastAIMessage : undefined}
                isCopied={!message.isUser && isCopied && index === messages.length - 1}
              />
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3">
                {isSearchingKnowledgeBase && (
                  <div className="text-xs text-gray-500 mb-2">Searching knowledge base...</div>
                )}
                <div className="flex space-x-2">
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
