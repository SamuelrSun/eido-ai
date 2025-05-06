
import { useState, useRef, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useToast } from "@/hooks/use-toast";

interface Message {
  content: string;
  isUser: boolean;
  timestamp: string;
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
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("openai_api_key") || "";
  });
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("openai_api_key", key);
    toast({
      title: "API Key Saved",
      description: "Your OpenAI API key has been saved locally.",
    });
  };

  const handleSendMessage = async (content: string) => {
    if (content.trim() === "") return;
    
    // Add user message
    const userMessage: Message = {
      content,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      if (!apiKey) {
        throw new Error("Please enter your OpenAI API key first");
      }

      // Create system prompt with cybersecurity context
      const systemPrompt = knowledgeBase 
        ? `You are CyberCoach AI, an expert cybersecurity assistant that helps answer questions based on ${knowledgeBase}. Provide clear, concise answers with actionable advice. Format your responses using markdown for clarity.`
        : "You are CyberCoach AI, an expert cybersecurity assistant. Provide clear, concise answers with actionable advice about cybersecurity topics. Format your responses using markdown for clarity.";

      // Call OpenAI API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map(msg => ({
              role: msg.isUser ? "user" : "assistant",
              content: msg.content
            })),
            { role: "user", content }
          ],
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Error calling OpenAI API");
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        content: data.choices[0].message.content,
        isUser: false,
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
        {!apiKey && (
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
              <Button onClick={() => saveApiKey(apiKey)}>Save</Button>
            </div>
            <p className="text-xs text-amber-500 mt-2">
              Your API key is stored locally in your browser and never sent to our servers.
            </p>
          </div>
        )}

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
