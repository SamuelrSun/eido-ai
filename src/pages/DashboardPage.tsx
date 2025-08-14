// src/pages/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { usePageLoader } from '@/context/LoaderContext';
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { OracleCard } from '@/components/dashboard/OracleCard';
import { DashboardCalendar } from '@/components/dashboard/DashboardCalendar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { SharedClassesCard } from '@/components/dashboard/SharedClassesCard';
import { WelcomePopup } from '@/components/dashboard/WelcomePopup';

const Footer = () => (
  <footer className="w-full px-4 py-6 md:px-9 lg:px-10 border-t border-marble-400 bg-marble-100 flex-shrink-0">
    <div className="flex flex-col md:flex-row justify-between items-center text-sm text-volcanic-800">
      <span>© 2025 Eido AI. All rights reserved.</span>
      <div className="flex gap-x-4 mt-4 md:mt-0">
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-volcanic-900 hover:underline">Privacy Policy</a>
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-volcanic-900 hover:underline">Terms of Service</a>
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
      <div className="flex h-full w-full justify-self-center md:gap-x-3">
        <DashboardSidebar onLinkClick={handleProtectedLinkClick} />
        
        <main className="flex h-full w-full flex-grow flex-col overflow-y-auto rounded-lg border border-marble-400 bg-marble-100">
          <WelcomeBanner user={user} profile={profile} onTutorialClick={handleOpenWelcomePopup} />
          
          <div className="flex-grow px-4 pb-10 md:px-9 lg:px-10">
            <div className="flex h-full w-full flex-col gap-y-6">

              {/* Grid for Oracle Card and Placeholder */}
              <div className="grid grid-cols-10 gap-6">
                {/* MODIFICATION: This column now contains both cards stacked vertically */}
                <div className="col-span-10 md:col-span-7 flex flex-col gap-y-6">
                   <OracleCard onClick={() => handleProtectedLinkClick('/oracle')} />
                    <SharedClassesCard onClick={() => handleProtectedLinkClick('/classes')} />
                </div>
                {/* MODIFICATION: This is now just a placeholder again */}
                <div className="hidden md:block col-span-3 rounded-lg border border-marble-400 bg-white">
                </div>
              </div>

              <DashboardCalendar onAddEventClick={() => handleProtectedLinkClick('/calendar')} />
            </div>
          </div>
          <Footer />
        </main>
      </div>
      <WelcomePopup
        isOpen={isWelcomePopupOpen}
        onClose={() => setIsWelcomePopupOpen(false)}
      />
    </MainAppLayout>
  );
};

export default DashboardPage;