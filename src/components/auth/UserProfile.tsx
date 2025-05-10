
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, Camera } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; 

export function UserProfile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          // Fetch profile information from the profiles table
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single() as any; // Type assertion to bypass TypeScript error
              
            if (error) {
              console.error("Error fetching profile:", error);
            } else {
              setProfile(data);
              console.log("Profile data loaded:", data);
            }
          } catch (error) {
            console.error("Error in profile fetch:", error);
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
            try {
              const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single() as any; // Type assertion to bypass TypeScript error
                
              if (error) {
                console.error("Error fetching profile on auth change:", error);
              } else {
                setProfile(data);
                console.log("Profile data loaded on auth change:", data);
              }
            } catch (error) {
              console.error("Error in profile fetch on auth change:", error);
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

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file || !user) return;
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Profile photo must be less than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setUploadingPhoto(true);
      
      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      console.log("Uploading file to path:", filePath);
      
      // Upload the file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);
        
      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }
      
      console.log("Upload successful:", uploadData);
      
      // Get the public URL
      const publicUrl = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath).data.publicUrl;
      
      console.log("Public URL:", publicUrl);
      
      // Update the user profile with the new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
        
      if (updateError) {
        console.error("Profile update error:", updateError);
        throw updateError;
      }
      
      // Update the local state
      setProfile({
        ...profile,
        avatar_url: publicUrl
      });
      
      toast({
        title: "Profile photo updated",
        description: "Your profile photo has been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
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
        <div className="flex flex-col items-center gap-2">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-2 border-white shadow-md">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile?.full_name || user.email} />
              ) : null}
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
