// src/pages/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { usePageLoader } from '@/context/LoaderContext';
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { OracleCard } from '@/components/dashboard/OracleCard';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { SharedClassesCard } from '@/components/dashboard/SharedClassesCard';
import { WelcomePopup } from '@/components/dashboard/WelcomePopup';
import FloatingShapes from '@/components/dashboard/FloatingShapes'; // Import the new component

const Footer = () => (
  <footer className="w-full px-4 py-6 md:px-9 lg:px-10 border-t border-neutral-800 bg-neutral-900 flex-shrink-0">
    <div className="flex flex-col md:flex-row justify-between items-center text-sm text-neutral-400">
      <span>© 2025 Eido AI. All rights reserved.</span>
      <div className="flex gap-x-4 mt-4 md:mt-0">
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-200 hover:underline">Privacy Policy</a>
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-200 hover:underline">Terms of Service</a>
      </div>
    </div>
  </footer>
);

const DashboardPage = () => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
    const { loadPage, loader } = usePageLoader();
    const [isWelcomePopupOpen, setIsWelcomePopupOpen] = useState(false);

    useEffect(() => {
        if (loader) {
        loader.complete();
        }
        
        const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        const popupShown = sessionStorage.getItem('eidoWelcomePopupShown');

        if (!user && !popupShown) {
            setIsWelcomePopupOpen(true);
            sessionStorage.setItem('eidoWelcomePopupShown', 'true');
        }
        };
        fetchUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
            setProfile(null);
        }
        });

        return () => {
        subscription.unsubscribe();
        };
    }, [loader]);

    useEffect(() => {
        const fetchProfile = async () => {
        if (user) {
            const { data, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .single();

            if (error) {
            console.error("Error fetching user profile:", error);
            } else if (data) {
            setProfile(data);
            }
        }
        };
        fetchProfile();
    }, [user]);

    const handleProtectedLinkClick = (path: string) => {
        if (user) {
        loadPage(path);
        } else {
        loadPage('/auth');
        }
    };

    const handleOpenWelcomePopup = () => setIsWelcomePopupOpen(true);

  return (
    <MainAppLayout pageTitle="Dashboard | Eido AI">
      <div className="flex h-full w-full gap-3">
        <DashboardSidebar onLinkClick={handleProtectedLinkClick} />
        
        {/* --- MODIFICATION START --- */}
        <main className="relative flex h-full w-full flex-grow flex-col overflow-hidden rounded-lg border border-foreground/20 bg-neutral-900">
          <FloatingShapes />
          
          <div className="relative z-10 flex flex-col h-full overflow-y-auto">
            {/* Combined Welcome Banner and Cards Section */}
            <div className="p-4 md:p-8">
                <div className="max-w-4xl">
                    <h1 className="text-4xl font-bold text-neutral-100">Welcome{profile?.full_name ? `, ${profile.full_name}` : '!'}</h1>
                    <p className="mt-2 text-neutral-400">
                        Eido is the educational copilot that transforms your coursework into a powerful suite of intelligent tools. Get started by{' '}
                        <span onClick={handleOpenWelcomePopup} className="text-blue-400 underline cursor-pointer hover:text-blue-300">
                            visiting the tutorial
                        </span>{' '}
                        or exploring the tools below.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    <OracleCard onClick={() => handleProtectedLinkClick('/oracle')} />
                    <SharedClassesCard onClick={() => handleProtectedLinkClick('/classes')} />
                </div>
            </div>

            <div className="flex-grow" />
            <Footer />
          </div>
        </main>
        {/* --- MODIFICATION END --- */}
      </div>
      <WelcomePopup
        isOpen={isWelcomePopupOpen}
        onClose={() => setIsWelcomePopupOpen(false)}
      />
    </MainAppLayout>
  );
};

export default DashboardPage;