import { useEffect, useState } from "react";
import { ChatBot } from "@/components/chat/ChatBot";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";

const StaticCoach = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const suggestions = [
    "What's Zero Trust?",
    "How do I spot a phishing email?", 
    "Password policy best practices", 
    "Secure remote work tips"
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    };
    checkAuth();
  }, []);

  // Auto-save the provided API key if user is authenticated
  useEffect(() => {
    const saveProvidedApiKey = async () => {
      if (isAuthenticated) {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          const apiKey = "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";
          
          const { error } = await supabase.from('api_keys').upsert(
            {
              key_name: 'openai',
              key_value: apiKey,
              user_id: session.session.user.id
            },
            { onConflict: 'user_id,key_name' }
          );

          if (!error) {
            toast({
              title: "API Key Configured",
              description: "Your OpenAI API key has been saved successfully.",
            });
          }
        }
      }
    };
    
    if (isAuthenticated !== null) {
      saveProvidedApiKey();
    }
  }, [isAuthenticated, toast]);

  const handleGoToSecureCoach = () => {
    navigate("/secure-coach");
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Cybersecurity Coach"
        description="Ask the AI Coach anything about cybersecurity best practices, policies, or hacker tactics—powered by OpenAI's models."
      />
      
      {isAuthenticated === false && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 mb-3">
            To use your API key across all your devices, sign in to save it securely.
          </p>
          <Button onClick={handleGoToSecureCoach} variant="outline">
            Go to Secure Coach
          </Button>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <ChatBot 
          suggestions={suggestions} 
          knowledgeBase="OpenAI GPT Model with Cybersecurity Context"
        />
      </div>
    </div>
  );
};

export default StaticCoach;
