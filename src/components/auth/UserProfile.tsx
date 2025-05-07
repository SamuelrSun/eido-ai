
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; 

export function UserProfile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          // Fetch profile information from the profiles table
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (error) {
            console.error("Error fetching profile:", error);
          } else {
            setProfile(data);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProfile();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN') {
          setUser(session?.user || null);
          
          // Fetch profile when signed in
          if (session?.user) {
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
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      // Clean up the subscription
      subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      setUser(null);
      setProfile(null);
      navigate("/auth");
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-cybercoach-blue" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userInitials = profile?.full_name 
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user.email.charAt(0).toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center mb-4">
          <Avatar className="h-24 w-24">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile?.full_name || user.email} />
            ) : null}
            <AvatarFallback className="text-xl">{userInitials}</AvatarFallback>
          </Avatar>
        </div>
        
        {profile?.full_name && (
          <div>
            <p className="text-sm font-medium text-gray-500">Name</p>
            <p>{profile.full_name}</p>
          </div>
        )}
        
        <div>
          <p className="text-sm font-medium text-gray-500">Email</p>
          <p>{user.email}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500">User ID</p>
          <p className="text-xs font-mono break-all">{user.id}</p>
        </div>
        
        <Button onClick={handleSignOut} variant="outline" className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign Out
        </Button>
      </CardContent>
    </Card>
  );
}
