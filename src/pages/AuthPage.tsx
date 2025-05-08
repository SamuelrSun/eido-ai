import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "@/components/auth/Auth";
import { UserProfile } from "@/components/auth/UserProfile";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";

const AuthPage = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        
        // If user is already logged in, redirect to home page
        if (data.session) {
          navigate("/");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      // If user just logged in, redirect to home
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Account Access"
        description="Sign in to save your chat history, preferences, and access personalized security recommendations."
      />

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <Auth />
      </div>
    </div>
  );
};

export default AuthPage;
