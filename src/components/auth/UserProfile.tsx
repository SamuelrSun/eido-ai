// src/components/auth/UserProfile.tsx
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Camera } from "lucide-react"; // Removed Upload, not used
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; 
import type { User } from "@supabase/supabase-js"; // Ensure User type is imported

// Define a more specific type for the profile data based on your 'profiles' table
interface ProfileData {
  user_id: string; // Matches the column name in your 'profiles' table
  full_name: string | null;
  avatar_url: string | null;
  // Add other fields from your 'profiles' table if needed (e.g., usage_description, created_at, updated_at)
}

export function UserProfile() {
  const [user, setUser] = useState<User | null>(null); // Use Supabase User type
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate(); // Not used in this component, can be removed if no navigation planned here

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setLoading(true); // Set loading true at the start of fetch
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error("Error fetching authenticated user:", authError);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        setUser(authUser);
        
        if (authUser) {
          console.log("UserProfile: Fetching profile for user_id:", authUser.id);
          // Fetch profile information from the profiles table
          // ** MODIFICATION: Changed .eq('id', ...) to .eq('user_id', ...) **
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url') // Select specific columns
            .eq('user_id', authUser.id) // Query by 'user_id' column
            .single(); 
            
          if (profileError) {
            // PGRST116 means no row was found, which is normal if a profile hasn't been created yet
            if (profileError.code === 'PGRST116') {
              console.log("UserProfile: No profile found for user_id:", authUser.id, "This might be expected for new users.");
              setProfile(null); // Explicitly set to null if not found
            } else {
              console.error("UserProfile: Error fetching profile:", profileError);
              toast({ title: "Error", description: "Could not fetch profile information.", variant: "destructive" });
              setProfile(null);
            }
          } else {
            setProfile(profileData as ProfileData); // Cast if select is specific, otherwise ensure type matches
            console.log("UserProfile: Profile data loaded:", profileData);
          }
        } else {
          setProfile(null); // No authenticated user
        }
      } catch (error) {
        console.error('UserProfile: Exception in fetchUserAndProfile:', error);
        toast({ title: "Error", description: "An unexpected error occurred while fetching user data.", variant: "destructive" });
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProfile();

    // Listen for auth state changes to re-fetch profile if user changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const authUser = session?.user || null;
        setUser(authUser);
        if (authUser) {
          await fetchUserAndProfile(); // Re-fetch profile on sign-in or user change
        } else {
          setProfile(null); // Clear profile on sign-out
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [toast]); // Removed navigate from dependencies as it's not used

  const handleSignOut = async () => { // This function seems to belong to AccountPage.tsx, but keeping if used here
    try {
      setLoading(true); // Consider a more specific loading state if needed
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      setUser(null);
      setProfile(null);
      // navigate("/auth"); // Navigation is typically handled by AuthGuard or parent component
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

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file || !user) return;
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({ title: "File too large", description: "Profile photo must be less than 5MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file type", description: "Please upload an image file", variant: "destructive" });
      return;
    }
    
    try {
      setUploadingPhoto(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`; // Use Date.now() for more uniqueness
      const filePath = `${fileName}`; // Path within the bucket
      
      console.log("UserProfile: Uploading profile photo to path:", filePath);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profiles') // Ensure this is your avatar bucket name
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true // Use upsert true to overwrite if a file with the same path exists (e.g., re-upload)
        });
        
      if (uploadError) {
        console.error("UserProfile: Upload error:", uploadError);
        throw uploadError;
      }
      
      console.log("UserProfile: Upload successful:", uploadData);
      
      const { data: publicUrlData } = supabase.storage
        .from('profiles') // Bucket name
        .getPublicUrl(filePath);
      
      const publicUrl = publicUrlData.publicUrl;
      console.log("UserProfile: Public URL:", publicUrl);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }) // Also update updated_at
        .eq('user_id', user.id); // Ensure using user_id for the WHERE clause
        
      if (updateError) {
        console.error("UserProfile: Profile update error:", updateError);
        throw updateError;
      }
      
      setProfile(prevProfile => ({
        ...(prevProfile || { user_id: user.id, full_name: null, avatar_url: null }), // Ensure prevProfile is not null
        avatar_url: publicUrl
      }));
      
      toast({ title: "Profile photo updated", description: "Your new photo is now active." });
    } catch (error: any) {
      console.error('UserProfile: Error uploading photo:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload profile photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This component might not render if user is null, handled by parent or AuthGuard
    return null; 
  }

  // Fallback for initials if profile or full_name is null
  const userInitials = profile?.full_name 
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user.email?.charAt(0).toUpperCase() || "?";

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-2">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-2 border-white shadow-md">
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={profile?.full_name || user.email || "User Avatar"} />
              )}
              <AvatarFallback className="text-xl">{userInitials}</AvatarFallback>
            </Avatar>
            <label 
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 p-1 bg-primary text-primary-foreground rounded-full cursor-pointer shadow-md hover:bg-primary/90 transition-colors"
            >
              <Camera className="h-4 w-4" />
              <span className="sr-only">Upload profile photo</span>
            </label>
            <input 
              type="file" 
              id="avatar-upload" 
              className="hidden" 
              accept="image/*"
              onChange={handleProfilePhotoChange}
              disabled={uploadingPhoto}
            />
          </div>
          {uploadingPhoto && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Uploading...</span>
            </div>
          )}
        </div>
        
        {profile?.full_name && (
          <div>
            <p className="text-sm font-medium text-muted-foreground">Name</p>
            <p>{profile.full_name}</p>
          </div>
        )}
        
        <div>
          <p className="text-sm font-medium text-muted-foreground">Email</p>
          <p>{user.email}</p>
        </div>
        
        {/* Sign Out button removed from here as it's in AccountPage.tsx */}
      </CardContent>
    </Card>
  );
}
