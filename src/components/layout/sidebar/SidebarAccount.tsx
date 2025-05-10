
import { NavLink } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SidebarAccountProps {
  loading: boolean;
  user: any;
}

export function SidebarAccount({ loading, user }: SidebarAccountProps) {
  const [profile, setProfile] = useState<any>(null);
  
  useEffect(() => {
    // Fetch profile data when user is available
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single() as any;
          
        if (error) {
          console.error("Error fetching profile:", error);
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error("Error in profile fetch:", error);
      }
    };
    
    fetchProfile();
  }, [user]);

  if (loading) {
    return null; // Don't render anything while loading
  }
  
  if (!user) {
    return (
      <NavLink
        to="/auth"
        className={({ isActive }) => 
          `flex items-center px-4 py-2 rounded-md transition-colors ${
            isActive 
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          }`
        }
      >
        <LogIn className="mr-2 h-5 w-5" />
        <span>Sign In</span>
      </NavLink>
    );
  }
  
  // Get user initials for avatar fallback
  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user.email?.charAt(0).toUpperCase() || "U";
    
  return (
    <NavLink 
      to="/account"
      className={({ isActive }) => 
        `flex items-center p-2 rounded-md transition-colors ${
          isActive 
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
        }`
      }
    >
      <Avatar className="w-8 h-8 rounded-full bg-sidebar-accent">
        {profile?.avatar_url && (
          <AvatarImage src={profile.avatar_url} alt={profile?.full_name || user.email} />
        )}
        <AvatarFallback className="text-xs font-medium">{userInitials}</AvatarFallback>
      </Avatar>
      <div className="ml-2 overflow-hidden">
        <p className="font-medium truncate">{user.email}</p>
        <p className="text-xs opacity-70 truncate">Signed In</p>
      </div>
    </NavLink>
  );
}
