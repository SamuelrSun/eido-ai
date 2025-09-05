// src/pages/ProfilePage.tsx
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
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
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { usePageLoader } from '@/context/LoaderContext';

const ProfilePage = () => {
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { toast } = useToast();
  const { loadPage } = usePageLoader();
  const navigate = useNavigate();

  const handleProtectedLinkClick = (path: string) => {
    if (path.startsWith('http')) {
      window.open(path, '_blank');
    } else {
      loadPage(path);
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
        console.warn("delete-user-account function returned an error:", functionError.message);
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
      await supabase.auth.signOut();
      localStorage.removeItem('eidoRecentFiles');
      sessionStorage.removeItem('activeClass');
      setIsDeletingAccount(false);
      navigate('/');
    }
  };

  return (
    <>
      <Helmet>
        <title>Profile | Eido AI</title>
      </Helmet>
      
      <MainAppLayout pageTitle="Profile | Eido AI">
        <div className="flex h-full w-full gap-3">
          <DashboardSidebar onLinkClick={handleProtectedLinkClick} />
          <main className="flex h-full w-full flex-grow flex-col overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-900">
              <div className="flex flex-col gap-y-8 p-4 md:p-8 lg:p-10">
                <div>
                  <h1 className="text-3xl font-bold text-neutral-100">
                    Profile & Settings
                  </h1>
                  <p className="text-sm text-neutral-400 mt-2">
                    Manage your profile, password, and account settings.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  <div className="lg:col-span-1">
                    <UserProfile />
                  </div>
                  <div className="lg:col-span-2 space-y-8">
                    <PasswordChangeForm />
                    
                    <Card className="bg-neutral-900 border-red-500/50">
                      <CardHeader>
                        <CardTitle className="text-destructive">Danger Zone</CardTitle>
                        <CardDescription>
                          These actions are permanent and cannot be undone.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-red-500/10 rounded-lg">
                          <div>
                              <h3 className="font-medium text-neutral-100">Delete Account</h3>
                              <p className="text-sm text-neutral-400">Permanently delete your account and all of your data.</p>
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
              </div>
          </main>
        </div>
      </MainAppLayout>
    </>
  );
};

export default ProfilePage;
