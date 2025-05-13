// src/components/layout/sidebar/SidebarAccount.tsx
import { NavLink } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js"; // Ensure User type is imported

interface ProfileData {
  full_name: string | null;
  avatar_url: string | null;
  // Add other fields from your 'profiles' table if needed
}

interface SidebarAccountProps {
  loading: boolean; // This prop comes from useSidebarState
  user: User | null;    // This prop comes from useSidebarState
}

export function SidebarAccount({ loading, user }: SidebarAccountProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user || !user.id) { // Check if user and user.id exist
        setProfile(null); // Clear profile if no user
        return;
      }
      
      try {
        // MODIFICATION: Querying 'profiles' table using 'user_id' column
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url') // Select only needed fields
          .eq('user_id', user.id) // Match against the 'user_id' column in 'profiles' table
          .single(); // Expecting a single profile per user
          
        if (error) {
          // PGRST116 means no row was found, which is not necessarily an error if profile creation is optional/deferred
          if (error.code === 'PGRST116') {
            console.log("SidebarAccount: No profile found for user:", user.id);
            setProfile(null);
          } else {
            console.error("SidebarAccount: Error fetching profile:", error);
            setProfile(null); // Set profile to null on error
          }
        } else {
          setProfile(data as ProfileData);
        }
      } catch (error) {
        console.error("SidebarAccount: Exception in profile fetch:", error);
        setProfile(null); // Set profile to null on exception
      }
    };
    
    if (user) { // Only fetch if user object exists
        fetchProfile();
    } else {
        setProfile(null); // Clear profile if user is null (e.g., on logout)
    }

  }, [user]); // Depend on user object

  if (loading) {
    return null; 
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
          <AvatarImage src={profile.avatar_url} alt={profile?.full_name || user.email || "User Avatar"} />
        )}
        <AvatarFallback className="text-xs font-medium">{userInitials}</AvatarFallback>
      </Avatar>
      <div className="ml-2 overflow-hidden">
        <p className="font-medium truncate">{user.email || "User"}</p>
        <p className="text-xs opacity-70 truncate">Signed In</p>
      </div>
    </NavLink>
  );
}
