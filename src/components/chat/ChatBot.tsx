
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
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (content: string) => {
    if (content.trim() === "") return;
    
    // Add user message
    const userMessage: Message = {
      content,
      isUser: true,
      timestamp: new Date().toLocaleTimeString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Mock AI response (for demo)
    setTimeout(() => {
      const aiResponse = getAIResponse(content);
      const aiMessage: Message = {
        content: aiResponse,
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };
  
  const getAIResponse = (query: string) => {
    // Mock AI responses based on query keywords
    const lowercaseQuery = query.toLowerCase();
    
    if (lowercaseQuery.includes("password")) {
      return "**Password best practices:**\n- Use at least 12 characters\n- Include uppercase, lowercase, numbers, and symbols\n- Don't reuse passwords across services\n- Consider using a password manager like LastPass or 1Password\n\nOur company policy requires changing passwords every 60 days.";
    } else if (lowercaseQuery.includes("phishing")) {
      return "**How to identify phishing emails:**\n- Check sender email addresses carefully\n- Be suspicious of urgent requests\n- Hover over links before clicking\n- Don't open unexpected attachments\n- Look for grammar/spelling errors\n\nIf you suspect a phishing attempt, forward it to security@company.com immediately.";
    } else if (lowercaseQuery.includes("vpn")) {
      return "**VPN Usage Guidelines:**\n- Always use company VPN when working remotely\n- Connect before accessing any company resources\n- Report connection issues to IT support\n- Don't share VPN credentials with anyone\n\nFor VPN installation instructions, visit [our internal wiki](https://wiki.company.com/vpn).";
    } else if (lowercaseQuery.includes("zero trust")) {
      return "**Zero Trust Architecture:**\n\nZero Trust is a security model based on the principle \"never trust, always verify.\" It requires strict identity verification for every person and device trying to access resources on our network, regardless of whether they are inside or outside the network perimeter.\n\nKey components include:\n- Multi-factor authentication\n- Micro-segmentation\n- Least privilege access\n- Device access control\n- Continuous monitoring";
    }
    
    // Default response
    return "Thank you for your question. As a cybersecurity assistant, I can help with topics like password policies, phishing detection, secure remote work practices, and compliance requirements. Could you provide more specific details about your cybersecurity concern?";
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
