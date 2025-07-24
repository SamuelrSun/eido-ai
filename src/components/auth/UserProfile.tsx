// src/components/auth/UserProfile.tsx
import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; 
import type { User } from "@supabase/supabase-js";
import { useAuth } from '@/context/AuthContext';

interface ProfileData {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  updated_at?: string;
}

export function UserProfile() {
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { toast } = useToast();

  const fetchProfileForUser = useCallback(async (authUser: User | null) => {
    if (!authUser?.id) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, updated_at')
        .eq('user_id', authUser.id)
        .single(); 
            
      if (profileError) {
        if (profileError.code === 'PGRST116') {
          console.log("UserProfile: No profile found for user_id:", authUser.id);
          setProfile(null);
        } else {
          console.error("UserProfile: Error fetching profile:", profileError);
          toast({ title: "Error", description: "Could not fetch profile information.", variant: "destructive" });
          setProfile(null);
        }
      } else {
        setProfile(profileData as ProfileData);
      }
    } catch (error) {
      console.error('UserProfile: Exception in fetchProfileForUser:', error);
      toast({ title: "Error", description: "An unexpected error occurred while fetching profile.", variant: "destructive" });
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProfileForUser(user);
  }, [user, fetchProfileForUser]);

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Profile photo must be less than 5MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file type", description: "Please upload an image file", variant: "destructive" });
      return;
    }
    
    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profiles') 
        .upload(filePath, file, { cacheControl: '3600', upsert: true });
        
      if (uploadError) throw uploadError;
      
      const { data: publicUrlData } = supabase.storage
        .from('profiles') 
        .getPublicUrl(filePath);
      
      const publicUrl = publicUrlData.publicUrl;
      const newUpdatedAt = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: newUpdatedAt }) 
        .eq('user_id', user.id); 
        
      if (updateError) throw updateError;
      
      setProfile(prevProfile => ({
        ...(prevProfile || { user_id: user.id, full_name: null, avatar_url: null }), 
        avatar_url: publicUrl,
        updated_at: newUpdatedAt
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

  if (loadingProfile) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <p className="p-4 text-sm text-muted-foreground">Please sign in to view your profile.</p>; 
  }

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
                <AvatarImage src={`${profile.avatar_url}?t=${profile.updated_at || Date.now()}`} alt={profile?.full_name || user.email || "User Avatar"} />
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
      </CardContent>
    </Card>
  );
}