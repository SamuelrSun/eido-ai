// extension/components/AuthComponent.tsx
import React, { useState } from 'react';
import { supabase } from '../../src/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

// Helper component for the Google Icon
const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      <path d="M1 1h22v22H1z" fill="none" />
    </svg>
);

// Inline SVGs for other icons to avoid adding new dependencies
const ArrowRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
);

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" />
    </svg>
);


export const AuthComponent = ({ onLogin }: { onLogin: (session: Session) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else if (data.session) {
      onLogin(data.session);
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    // *** FIX: Added redirectTo option to prevent full-page navigation ***
    // This tells Supabase to return to the extension's own page after Google auth,
    // instead of redirecting to your main website.
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
      }
    });
    setGoogleLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        <h1 className="auth-title">Log in</h1>
        <p className="auth-subtitle">Welcome back to Eido! What will you study today?</p>

        <div className="auth-actions">
          <button onClick={handleGoogleSignIn} className="auth-button-google" disabled={loading || googleLoading}>
            {googleLoading ? <div className="spinner-small"></div> : <GoogleIcon />}
            Continue with Google
          </button>

          <div className="auth-separator">
            <span className="auth-separator-line"></span>
            <span className="auth-separator-text">OR</span>
            <span className="auth-separator-line"></span>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-input-wrapper">
              <label htmlFor="email">EMAIL</label>
              <input
                id="email"
                type="email"
                placeholder="yourname@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-input-wrapper">
              <label htmlFor="password">PASSWORD</label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-password-toggle"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            
            <a href="#" className="auth-forgot-password" onClick={(e) => e.preventDefault()}>Forgot Password?</a>

            <button type="submit" className="auth-button-primary" disabled={loading || googleLoading}>
              {loading ? <div className="spinner"></div> : 'Log in'}
              {!loading && <ArrowRightIcon />}
            </button>
          </form>
        </div>
        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  );
};