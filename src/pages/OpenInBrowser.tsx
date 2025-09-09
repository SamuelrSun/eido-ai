// src/pages/OpenInBrowser.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Chrome, Globe } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { MainAppLayout } from '@/components/layout/MainAppLayout';

const OpenInBrowser = () => {
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const redirectUrl = queryParams.get('redirect');

  useEffect(() => {
    // This immediately attempts to redirect to the original URL.
    // On iOS and some Android in-app browsers, this will trigger a native
    // prompt asking the user to open the page in their default browser.
    if (redirectUrl) {
      window.location.replace(redirectUrl);
    }
  }, [redirectUrl]);

  // Fallback handler for the manual button
  const handleManualOpen = () => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  return (
    <>
      <Helmet>
        <title>Open in Browser | Eido AI</title>
      </Helmet>
      <MainAppLayout pageTitle="Open in Browser | Eido AI">
        <div className="min-h-screen w-full bg-neutral-950 flex items-center justify-center p-4">
          <div className="text-center bg-neutral-900 border border-neutral-800 text-neutral-100 p-8 md:p-12 rounded-2xl shadow-lg max-w-lg mx-auto">
            <div className="flex justify-center mb-6 space-x-4">
              {isIOS ? (
                <Globe className="w-16 h-16 text-blue-500" />
              ) : (
                <Chrome className="w-16 h-16 text-red-500" />
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4">
              Switching to a real browser
            </h1>
            <p className="text-sm md:text-base text-neutral-400 mb-6">
              You are currently in an in-app browser. For a secure and seamless sign-in experience, we need to redirect you to your device's default browser.
            </p>
            <p className="text-sm md:text-base text-neutral-400 mb-6">
              Please click "Open" or "Continue" in the pop-up notification. If a pop-up doesn't appear, you can try manually.
            </p>
            {redirectUrl && (
              <Button onClick={handleManualOpen}>
                {isIOS ? 'Open in Default Browser' : 'Open in Chrome'}
              </Button>
            )}
          </div>
        </div>
      </MainAppLayout>
    </>
  );
};

export default OpenInBrowser;