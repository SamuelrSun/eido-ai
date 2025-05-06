
import { useState, useEffect } from "react";
import { Auth } from "@/components/auth/Auth";
import { UserProfile } from "@/components/auth/UserProfile";
import { ChatBot } from "@/components/chat/ChatBot";
import { supabase } from "@/integrations/supabase/client";

const SecureCoach = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const suggestions = [
    "What are the latest phishing techniques?",
    "How do I create a strong password policy?", 
    "Best practices for remote work security", 
    "How to respond to a data breach"
  ];

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-cybercoach-blue-dark">Secure Cybersecurity Coach</h1>
        <p className="text-gray-600 mb-6">
          Sign in to securely save your API key and access the AI coach from any device. This coach uses OpenAI's Assistant with knowledge retrieval for accurate cybersecurity guidance.
        </p>
      </div>

      {!session ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <Auth />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <UserProfile />
          </div>
          <div className="md:col-span-3">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <ChatBot 
                suggestions={suggestions} 
                knowledgeBase="OpenAI Assistant with Vector Knowledge Retrieval"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecureCoach;
