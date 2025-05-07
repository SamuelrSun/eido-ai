
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'signup') {
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        toast({
          title: "Welcome back!",
          description: "You have been signed in successfully.",
        });
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
          errorMessage = "Password should be at least 6 characters long.";
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

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{authMode === 'signin' ? 'Sign In' : 'Sign Up'}</CardTitle>
        <CardDescription>
          {authMode === 'signin' 
            ? 'Enter your credentials to sign in to your account' 
            : 'Create a new account to use all features'}
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
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {authMode === 'signup' && (
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 6 characters long
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Processing...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" onClick={toggleAuthMode} className="w-full">
          {authMode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
        </Button>
      </CardFooter>
    </Card>
  );
}
