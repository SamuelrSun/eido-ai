
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
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'available' | 'missing' | 'error'>('checking');
  const [apiKey, setApiKey] = useState<string>("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    checkApiKeyStatus();
  }, []);

  const checkApiKeyStatus = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        setApiKeyStatus('missing');
        return;
      }
      
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_name', 'openai')
        .maybeSingle();
      
      if (error) {
        console.error("Error checking API key:", error);
        setApiKeyStatus('error');
      } else if (!data) {
        setApiKeyStatus('missing');
      } else {
        setApiKeyStatus('available');
      }
    } catch (error) {
      console.error("Error in API key status check:", error);
      setApiKeyStatus('error');
    }
  };

  const saveApiKey = async (key: string) => {
    if (!key.trim().startsWith('sk-')) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid OpenAI API key starting with 'sk-'.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        // If no session, user needs to sign up/in first
        toast({
          title: "Authentication Required",
          description: "Please sign in first to save your API key.",
          variant: "destructive",
        });
        return;
      }

      // Fixed: Add user_id to the insert operation
      const { error } = await supabase.from('api_keys').upsert(
        { 
          key_name: 'openai', 
          key_value: key,
          user_id: session.session.user.id // Added user_id
        },
        { onConflict: 'user_id,key_name' }
      );

      if (error) {
        console.error("Error saving API key:", error);
        toast({
          title: "Error Saving API Key",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setApiKey(key);
        setApiKeyStatus('available');
        toast({
          title: "API Key Saved",
          description: "Your OpenAI API key has been saved securely.",
        });
      }
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    
    try {
      if (apiKeyStatus !== 'available') {
        throw new Error("Please add your OpenAI API key first");
      }

      // Get the session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("You must be signed in to use the chat");
      }

      // Prepare messages array for the API
      const apiMessages = messages.map(msg => ({
        role: msg.role || (msg.isUser ? "user" : "assistant"),
        content: msg.content
      }));
      
      // Add the new user message
      apiMessages.push({ role: "user", content });

      // Call our edge function that proxies to OpenAI API
      const response = await fetch(`https://dbldoxurkcpbtdswcbkc.supabase.co/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          messages: apiMessages,
          knowledgeBase
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error calling OpenAI API");
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        content: data.choices[0].message.content,
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
    }
  };
  
  const resetChat = () => {
    setMessages([]);
    toast({
      title: "Chat Reset",
      description: "Your conversation history has been cleared.",
    });
  };

  const renderApiKeySection = () => {
    if (apiKeyStatus === 'checking') {
      return (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-md mb-4 text-center">
          <div className="flex justify-center">
            <div className="flex space-x-2">
              <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Checking API key status...</p>
        </div>
      );
    }
    
    if (apiKeyStatus === 'available') {
      return null; // Don't show anything if key is available
    }
    
    return (
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-md mb-4">
        <h4 className="font-medium text-amber-700 mb-2">OpenAI API Key Required</h4>
        <p className="text-sm text-amber-600 mb-3">
          To use the AI chatbot, please enter your OpenAI API key:
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <Button onClick={() => saveApiKey(apiKey)} disabled={isLoading}>Save</Button>
        </div>
        <p className="text-xs text-amber-500 mt-2">
          Your API key is stored securely in your Supabase database and never shared.
        </p>
      </div>
    );
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
        {renderApiKeySection()}

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
