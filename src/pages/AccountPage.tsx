// src/pages/AccountPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserProfile } from "@/components/auth/UserProfile";
import { PasswordChangeForm } from "@/components/auth/PasswordChangeForm";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react"; // Added Trash2 icon
import { PageHeader } from "@/components/layout/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, // Import AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import type { User, Session } from "@supabase/supabase-js"; // Import User and Session types

const AccountPage = () => {
  const [session, setSession] = useState<Session | null>(null); 
  const [loadingPage, setLoadingPage] = useState(true); // General loading for session/initial data
  const [isSignOutLoading, setIsSignOutLoading] = useState(false); 
  const [isDeletingAccount, setIsDeletingAccount] = useState(false); 
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchSession = async () => {
      setLoadingPage(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(data.session);
        
        if (!data.session) {
          console.log("AccountPage: No session, redirecting to /auth");
          navigate("/auth");
        }
      } catch (e) {
        console.error("AccountPage: Error fetching session:", e);
        navigate("/auth"); 
      } finally {
        setLoadingPage(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sessionState) => {
      setSession(sessionState);
      if (!sessionState && _event !== "INITIAL_SESSION") { // Avoid redirect on initial load if session is briefly null
        console.log("AccountPage: Auth state changed to signed out, redirecting to /auth. Event:", _event);
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    setIsSignOutLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out successfully",
        description: "You've been signed out of your account",
      });
      // onAuthStateChange listener will handle navigation to /auth
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Sign out failed",
        description: "There was a problem signing you out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSignOutLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      // The Edge Function 'delete-user-account' uses the Authorization header (JWT)
      // from the authenticated Supabase client to identify the user.
      const { data, error: functionError } = await supabase.functions.invoke('delete-user-account');

      if (functionError) {
        console.error("Edge function invocation error (delete-user-account):", functionError);
        throw new Error(functionError.message || "Failed to initiate account deletion process due to a function error.");
      }

      if (data.error) { // Check for errors returned in the function's response body
        console.error("Error from delete-user-account function:", data.error);
        throw new Error(data.error);
      }

      toast({
        title: "Account Deletion Successful",
        description: "Your account and all associated data are being deleted. You will be signed out.",
      });
      
      // Explicitly sign out on the client-side to clear local session immediately.
      // The onAuthStateChange listener will then redirect to /auth.
      await supabase.auth.signOut();

    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Account Deletion Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (loadingPage) { 
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-var(--header-height,60px)-2rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!session) {
    // This case should ideally be handled by AuthGuard or the useEffect redirect,
    // but it's a good fallback.
    return <p>Redirecting to sign-in...</p>;
  }


  return (
    <div className="space-y-6">
      <PageHeader 
        title="My Account"
        description="Manage your profile and account settings"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <UserProfile />
        </div>
        <div className="md:col-span-3 space-y-6">
          <PasswordChangeForm />
          
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Update your account preferences and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Email Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Configure what types of emails you want to receive
                </p>
                {/* Add notification settings here in the future */}
              </div>
              
              <div className="pt-6 border-t flex flex-col sm:flex-row gap-2 items-start">
                <Button 
                  variant="outline" 
                  onClick={handleSignOut} 
                  disabled={isSignOutLoading || isDeletingAccount} 
                  className="w-full sm:w-auto"
                >
                  {isSignOutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sign Out
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      disabled={isSignOutLoading || isDeletingAccount}
                      className="w-full sm:w-auto"
                    >
                      {isDeletingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove all your associated data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeletingAccount}>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount} 
                        disabled={isDeletingAccount}
                        // className="bg-destructive text-destructive-foreground hover:bg-destructive/90" // Already destructive from variant
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
  );
};

export default AccountPage;
