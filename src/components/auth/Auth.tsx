// src/components/auth/Auth.tsx
import { useState } from 'react';
import { Label } from "../ui/label";
import { useToast } from "../ui/use-toast";
import { supabase } from "../../integrations/supabase/client";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import ShimmerButton from '../ui/ShimmerButton';

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
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
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [showPassword, setShowPassword] = useState(false);
  
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);

    if (!email || !password) {
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'signup') {
        if (password.length < 10) {
          throw new Error("Password should be at least 10 characters long.");
        }
        const generatedName = email.split('@')[0];

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              full_name: generatedName,
              avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${generatedName}`
            }
          }
        });

        if (error) throw error;

        if (data.session) {
            toast({
                title: "Account Created!",
                description: "Welcome to Eido AI.",
            });
            navigate('/');
        } else {
            toast({
                title: "Account created successfully",
                description: "We've sent you a confirmation link to complete your signup.",
            });
        }
      } else { 
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/');
      }
    } catch (error) {
      console.error('Email auth error:', error);
      let errorMessage = "An error occurred during authentication";
      if (error instanceof Error) {
        if (error.message.includes("Email not confirmed")) errorMessage = "Please check your email and confirm your address.";
        else if (error.message.includes("Invalid login credentials")) errorMessage = "Invalid email or password.";
        else if (error.message.includes("User already registered")) errorMessage = "An account with this email already exists. Please sign in or use a different email.";
        else if (error.message.includes("Password should be")) errorMessage = "Password must be at least 10 characters long.";
        else errorMessage = error.message;
      }
      toast({ title: "Authentication Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const ua = navigator.userAgent;

    const isLinkedIn = /linkedin|linkedinapp/i.test(ua);
    const isFacebook = /(facebook|fbav|fban|fbfor|fbdav|fb_iab)/i.test(ua);
    const isInstagram = /instagram/i.test(ua);
    const isAndroidWebView = /wv\)/i.test(ua);

    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isIOSWebView = isIOS && !/safari/i.test(ua);

    const isInAppBrowser = isLinkedIn || isFacebook || isInstagram || isAndroidWebView || isIOSWebView;

    if (isInAppBrowser) {
      const currentUrl = window.location.href;

      if (isIOS) {
        // iOS: trigger Safari sheet
        window.location.replace(`https://${window.location.host}/open-in-browser?redirect=${encodeURIComponent(currentUrl)}`);
      } else {
        // Android: use intent scheme to force Chrome
        const pkg = "com.android.chrome";
        const intentUrl = `intent://${window.location.host}/open-in-browser?redirect=${encodeURIComponent(currentUrl)}#Intent;scheme=https;package=${pkg};end`;
        window.location.href = intentUrl;
      }
      return;
    }

    // Standard Google Sign-In
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
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
    setAuthMode(prevMode => (prevMode === 'signin' ? 'signup' : 'signin'));
    setEmailTouched(false);
    setPasswordTouched(false);
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-neutral-100 font-sans">
          {authMode === 'signin' ? 'Log in' : 'Sign Up'}
        </h1>
        <p className="text-sm text-neutral-400 mt-2">
          {authMode === 'signin' 
            ? 'Welcome back to Eido! What will you study today?' 
            : 'Get started with your personal, educational copilot.'}
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3">
          <ShimmerButton
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full justify-center py-3 text-xs h-11 bg-transparent border border-neutral-700 text-neutral-300 hover:bg-neutral-800/80 hover:border-neutral-600 hover:text-neutral-100"
          >
            {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </ShimmerButton>
        </div>

        <div className="relative">
           <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-700" />
            </div>
            <div className="relative flex justify-center text-xs">
                <span className="bg-neutral-900 px-2 text-neutral-500">OR</span>
            </div>
        </div>

        <form className="space-y-6" onSubmit={handleEmailAuth} noValidate>
          <div className="space-y-4">
            <div className={cn(
               "relative rounded-md border px-3 py-2 transition-all bg-neutral-900 border-neutral-700",
                "focus-within:border-blue-500"
            )}>
              {emailTouched && !email && (
                  <span className="absolute top-1 right-2 text-xs text-red-500">*required</span>
              )}
              <Label htmlFor="email" className="block text-xs font-medium text-neutral-400 uppercase">
                Email
              </Label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onBlur={() => setEmailTouched(true)}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-0 border-none bg-transparent focus:outline-none focus:ring-0 text-sm text-neutral-100 placeholder:text-neutral-500 h-auto"
                placeholder="yourname@email.com"
              />
            </div>

            <div>
              <div className={cn(
                  "relative rounded-md border px-3 py-2 transition-all bg-neutral-900 border-neutral-700",
                  "focus-within:border-blue-500"
              )}>
                {passwordTouched && !password && (
                    <span className="absolute top-1 right-2 text-xs text-red-500">*required</span>
                )}
                <Label htmlFor="password" className="block text-xs font-medium text-neutral-400 uppercase">
                  Password
                </Label>
                <div className="flex items-center">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onBlur={() => setPasswordTouched(true)}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={authMode === 'signup' ? 10 : undefined}
                    className="w-full p-0 border-none bg-transparent focus:outline-none focus:ring-0 text-sm text-neutral-100 placeholder:text-neutral-500 h-auto"
                    placeholder="••••••••••"
                  />
                  <button
                    type="button"
                    onClick={toggleShowPassword}
                    className="flex items-center text-neutral-500 hover:text-neutral-300 pl-2"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              {authMode === 'signin' && (
                  <div className="flex justify-end mt-2">
                    <a href="#" className="text-xs font-medium text-blue-400 hover:underline">
                      Forgot Password?
                    </a>
                  </div>
              )}
            </div>
          </div>

          <div>
            <ShimmerButton
              type="submit"
              className="w-full flex justify-center items-center py-3 px-4 text-xs font-semibold rounded-md h-11 border border-blue-500 bg-blue-950/80 text-neutral-100 hover:border-blue-400"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {authMode === 'signin' ? 'Log in' : 'Create Account'}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </ShimmerButton>
          </div>
        </form>
      </div>

      <div className="mt-8 space-y-2 text-center text-xs">
        <p className="text-neutral-500">
          By signing up, you agree to the{' '}
          <Link to="/terms" className="font-medium text-blue-400 hover:underline" target="_blank">Terms of Service</Link> and{' '}
          <Link to="/privacy" className="font-medium text-blue-400 hover:underline" target="_blank">Privacy Policy</Link>.
        </p>
        <p className="text-neutral-500">
          {authMode === 'signin' ? 'New user? ' : 'Already have an account? '}
          <button
            onClick={toggleAuthMode}
            className="font-medium text-neutral-300 hover:text-white"
            disabled={loading || googleLoading}
          >
            {authMode === 'signin' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}
