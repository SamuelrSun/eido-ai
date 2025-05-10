
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from 'react-router-dom';

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup'); // Default to signup
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'signup') {
        // For signup, enforce 10-character password
        if (password.length < 10) {
          throw new Error("Password should be at least 10 characters long.");
        }
        
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName
            }
          }
        });
        
        if (error) throw error;
        
        toast({
          title: "Account created successfully",
          description: "We've sent you a confirmation link to complete your signup.",
        });
      } else {
        // For signin, don't validate password length client-side
        // Let the server handle validation against stored credentials
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
        
        // Redirect to home page after successful sign in
        navigate('/');
      }
    } catch (error) {
      console.error('Auth error:', error);
      let errorMessage = "An error occurred during authentication";
      
      if (error instanceof Error) {
        // Handle common authentication errors with more user-friendly messages
        if (error.message.includes("Email not confirmed")) {
          errorMessage = "Please check your email inbox and confirm your email address before signing in.";
        } else if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password. Please try again.";
        } else if (error.message.includes("User already registered")) {
          errorMessage = "An account with this email already exists. Please sign in instead.";
        } else if (error.message.includes("Password should be")) {
          errorMessage = "Password should be at least 10 characters long.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Authentication error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          {authMode === 'signin' ? 'Sign In' : 'Create Account'}
        </CardTitle>
        <CardDescription className="text-center">
          {authMode === 'signin' 
            ? 'Enter your credentials to access your account' 
            : 'Sign up to start using all features'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAuth} className="space-y-4">
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
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1 h-8 w-8 text-muted-foreground"
                onClick={toggleShowPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {authMode === 'signup' && (
              <p className="text-xs text-muted-foreground mt-1">
                Password must be at least 10 characters long
              </p>
            )}
          </div>
          <Button 
            type="submit" 
            className="w-full bg-sidebar hover:bg-sidebar-accent text-white"
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Processing...' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <Button 
          variant="ghost" 
          onClick={toggleAuthMode} 
          className="w-full text-sm hover:bg-muted/20"
        >
          {authMode === 'signin' 
            ? "Don't have an account? Sign Up" 
            : "Already have an account? Sign In"}
        </Button>
      </CardFooter>
    </Card>
  );
}
