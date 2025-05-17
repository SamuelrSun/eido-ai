// src/components/auth/Auth.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from 'react-router-dom';

// Simple SVG for Google Icon
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false); // Separate loading state for Google
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'signup') {
        if (password.length < 10) {
          throw new Error("Password should be at least 10 characters long.");
        }
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`, // Redirect to home after confirmation
            data: {
              full_name: fullName // This will be used by the trigger to populate profiles
            }
          }
        });
        if (error) throw error;
        toast({
          title: "Account created successfully",
          description: "We've sent you a confirmation link to complete your signup.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({
          title: "Welcome back!", // Changed from "Welcome to Eido beta!"
          description: "You have been signed in successfully.",
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Email auth error:', error);
      let errorMessage = "An error occurred during authentication";
      if (error instanceof Error) {
        if (error.message.includes("Email not confirmed")) errorMessage = "Please check your email and confirm your address.";
        else if (error.message.includes("Invalid login credentials")) errorMessage = "Invalid email or password.";
        else if (error.message.includes("User already registered")) errorMessage = "An account with this email already exists. Please sign in or use a different email.";
        else if (error.message.includes("Password should be")) errorMessage = "Password should be at least 10 characters long.";
        else errorMessage = error.message;
      }
      toast({ title: "Authentication Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`, // Redirect to home after Google sign-in
          // You can add scopes if needed, but Supabase defaults usually cover profile & email
          // scopes: 'email profile https://www.googleapis.com/auth/user.birthday.read', 
          // queryParams: { access_type: 'offline', prompt: 'consent' } // Example query params
        },
      });
      if (error) throw error;
      // Note: The user is redirected to Google and then back. 
      // The actual session creation and navigation happens after the redirect.
      // A toast here might not be seen if the redirect is too fast.
      // Successful sign-in is usually handled by the AuthGuard or onAuthStateChange listener.
    } catch (error) {
      console.error('Google Sign-In error:', error);
      toast({
        title: "Google Sign-In Error",
        description: error instanceof Error ? error.message : "Could not sign in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Card className="w-full max-w-md bg-white shadow-lg border-0">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl font-bold text-center">
          {authMode === 'signin' ? 'Sign In' : 'Welcome to Eido'}
        </CardTitle>
        <CardDescription className="text-center">
          {authMode === 'signin' 
            ? 'Enter your credentials to access your account' 
            : 'Get started with your personal AI copilot for coursework!'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {authMode === 'signup' && (
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-muted/30"
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-muted/30 pl-10"
            />
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={authMode === 'signup' ? 10 : undefined}
              className="bg-muted/30 pl-10"
            />
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
              onClick={toggleShowPassword}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {authMode === 'signup' && (
            <p className="text-xs text-muted-foreground mt-1">
              Password must be at least 10 characters long.
            </p>
          )}
        </div>

        <Button 
          type="submit" 
          onClick={handleEmailAuth}
          className="w-full bg-sidebar hover:bg-sidebar-accent text-white"
          disabled={loading || googleLoading}
        >
          {loading && !googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {loading && !googleLoading ? 'Processing...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
        </Button>

        {/* "OR" Separator */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>

        {/* Google Sign-In Button */}
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
        >
          {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
          <span className="ml-2">Continue with Google</span>
        </Button>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button 
          variant="link" 
          onClick={toggleAuthMode} 
          className="w-full text-sm text-muted-foreground hover:text-primary"
          disabled={googleLoading || loading}
        >
          {authMode === 'signin' 
            ? "Don't have an account? Sign Up" 
            : "Already have an account? Sign In"}
        </Button>
      </CardFooter>
    </Card>
  );
}
