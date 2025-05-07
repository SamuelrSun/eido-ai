
import { useState, useRef, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

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
      // Get the session for authentication - but don't require it
      const { data: { session } } = await supabase.auth.getSession();
      
      // Prepare messages array for the API
      const apiMessages = messages.map(msg => ({
        role: msg.role || (msg.isUser ? "user" : "assistant"),
        content: msg.content
      }));
      
      // Add the new user message
      apiMessages.push({ role: "user", content });

      // Call our edge function that proxies to OpenAI API
      console.log("Sending request to chat function");
      const response = await fetch(`https://dbldoxurkcpbtdswcbkc.supabase.co/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": session ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({
          messages: apiMessages,
          knowledgeBase
        })
      });

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
      console.error("Error:", error);
      
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

  return (
    <Card className="h-full flex flex-col">
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
        
        <div className="mt-auto">
          <ChatInput 
            onSend={handleSendMessage} 
            suggestions={suggestions}
            isLoading={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
