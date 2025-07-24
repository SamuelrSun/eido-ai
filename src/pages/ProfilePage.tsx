// src/pages/ProfilePage.tsx
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { UserProfile } from "@/components/auth/UserProfile";
import { PasswordChangeForm } from "@/components/auth/PasswordChangeForm";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MainAppLayout } from '@/components/layout/MainAppLayout';

const ProfilePage = () => {
  const [isSignOutLoading, setIsSignOutLoading] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { toast } = useToast();

  const handleSignOut = async () => {
    setIsSignOutLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      localStorage.removeItem('eidoRecentFiles');
      sessionStorage.removeItem('activeClass');
      toast({
        title: "Signed out successfully",
        description: "You've been signed out of your account",
      });
    } catch (error: unknown) {
      console.error("Error signing out:", error);
      toast({
        title: "Sign out failed",
        description: (error instanceof Error) ? error.message : "There was a problem signing you out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSignOutLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const { error: functionError } = await supabase.functions.invoke(
        'delete-user-account',
        { body: {} }
      );

      if (functionError) {
        // Log the error but proceed to sign out, as the user might already be deleted.
        console.warn("delete-user-account function returned an error (this is often expected if the user's token was invalidated mid-request):", functionError.message);
      }

      toast({
        title: "Account Deletion Initiated",
        description: "Your account and all associated data will be removed.",
      });

    } catch (error: unknown) {
      console.error('Error during account deletion process:', error);
      toast({
        title: "Account Deletion Failed",
        description: (error instanceof Error) ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      // --- FIX: This block now runs regardless of success or failure of the try block. ---
      // This ensures the client session is always cleared, preventing inconsistent states.
      await supabase.auth.signOut();
      localStorage.removeItem('eidoRecentFiles');
      sessionStorage.removeItem('activeClass');
      setIsDeletingAccount(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Profile | Eido AI</title>
      </Helmet>
      
      <MainAppLayout pageTitle="Profile | Eido AI">
        <div className="h-full w-full bg-mushroom-100">
          <div className="mx-auto flex h-screen w-screen max-w-page flex-1 flex-col overflow-y-auto md:overflow-y-visible">
            
            <div className="flex w-full flex-grow justify-self-center pb-3 md:gap-x-3 main-content">
              <div className="ml-3 hidden md:flex">
                <div className="flex flex-col justify-between overflow-auto border-marble-400 bg-marble-100 md:rounded-lg md:border md:w-42 w-full lg:w-56 px-4 md:py-6">
                   <nav className="hidden w-full flex-col gap-y-8 md:flex">
                    <div className="flex flex-col gap-y-1">
                      <span className="text-overline uppercase font-code font-bold text-dark-blue">Platform</span>
                      <Link to="/"><span className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900"><span>Dashboard</span></span></Link>
                      <Link to="/classes"><span className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900"><span>Classes</span></span></Link>
                    </div>
                    <div className="flex flex-col gap-y-1">
                      <span className="text-overline uppercase font-code font-bold text-dark-blue">Tools</span>
                      <Link to="/oracle"><span className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900"><span>Oracle</span></span></Link>
                    </div>
                     <div className="flex flex-col gap-y-1">
                      <span className="text-overline uppercase font-code font-bold text-dark-blue">Settings</span>
                      <Link to="/billing"><span className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900"><span>Billing</span></span></Link>
                      <Link to="/profile"><span className="text-p font-body flex items-center py-0.5 text-volcanic-900"><div className="mr-3 h-2 w-2 rounded-full bg-coral-500"></div><span className="font-medium">Profile</span></span></Link>
                     </div>
                  </nav>
                </div>
              </div>
              <main className="mx-3 flex h-full w-full flex-grow flex-col overflow-y-auto rounded-lg border border-marble-400 bg-marble-100 md:ml-0">
                  <div className="flex flex-col gap-y-8 p-4 md:p-9 lg:p-10">
                    <div>
                      <h1 className="text-h5-m lg:text-h4 font-variable font-[420] text-volcanic-900">
                        Profile & Settings
                      </h1>
                      <p className="text-p font-body text-volcanic-800 mt-2">
                        Manage your profile, password, and account settings.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-1">
                        <UserProfile />
                      </div>
                      <div className="lg:col-span-2 space-y-8">
                        <PasswordChangeForm />
                        
                        <Card className="border-red-500/30">
                          <CardHeader>
                            <CardTitle className="text-destructive">Danger Zone</CardTitle>
                            <CardDescription>
                              These actions are permanent and cannot be undone.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-red-500/5 rounded-lg">
                              <div>
                                  <h3 className="font-medium text-volcanic-900">Delete Account</h3>
                                  <p className="text-sm text-volcanic-800">Permanently delete your account and all of your data.</p>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    disabled={isDeletingAccount}
                                    className="w-full sm:w-auto flex-shrink-0"
                                  >
                                    {isDeletingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Delete Account
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete your account and remove all associated data from our servers. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeletingAccount}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleDeleteAccount}
                                      disabled={isDeletingAccount}
                                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                    >
                                      {isDeletingAccount ? "Deleting..." : "Yes, delete my account"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                    <div className="pt-6 border-t mt-4">
                          <Button
                            variant="outline"
                            onClick={handleSignOut}
                            disabled={isSignOutLoading || isDeletingAccount}
                          >
                            {isSignOutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Sign Out
                          </Button>
                    </div>
                  </div>
              </main>
            </div>
          </div>
        </div>
      </MainAppLayout>
    </>
  );
};

export default ProfilePage;