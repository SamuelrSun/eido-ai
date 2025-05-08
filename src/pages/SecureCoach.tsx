
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChatBot } from "@/components/chat/ChatBot";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const SecureCoach = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const suggestions = [
    "What are the latest phishing techniques?",
    "How do I create a strong password policy?", 
    "Best practices for remote work security", 
    "How to respond to a data breach"
  ];

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        setSession(sessionData.session);

        if (sessionData.session?.user) {
          // Fetch user profile from the profiles table
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sessionData.session.user.id)
            .single();
          
          if (error) {
            console.error("Error fetching profile:", error);
          } else {
            setProfile(profileData);
          }
        } else {
          // If not authenticated, redirect to auth page
          navigate("/auth");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (!session) {
        // If logged out, redirect to auth page
        navigate("/auth");
      } else {
        // Fetch profile when auth state changes
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
          console.error("Error fetching profile on auth change:", error);
        } else {
          setProfile(data);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-cybercoach-blue" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Secure Cybersecurity Coach</h1>
          <p className="text-muted-foreground mt-1">
            Sign in to securely access the AI coach with advanced cybersecurity guidance.
          </p>
          <Button onClick={() => navigate("/auth")} className="mt-4">
            Sign In to Access
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Secure Cybersecurity Coach</h1>
        <p className="text-muted-foreground mt-1">
          Advanced AI assistant with personalized cybersecurity guidance and knowledge retrieval.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <ChatBot 
          suggestions={suggestions} 
          knowledgeBase="OpenAI Assistant with Vector Knowledge Retrieval"
        />
      </div>
    </div>
  );
};

export default SecureCoach;
