// src/pages/DashboardPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { usePageLoader } from '@/context/LoaderContext';
import { MainAppLayout } from '@/components/layout/MainAppLayout';
import { OracleCard } from '@/components/dashboard/OracleCard';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ClassesCard } from '@/components/dashboard/ClassesCard';
import { WelcomePopup } from '@/components/dashboard/WelcomePopup';
import FloatingShapes from '@/components/dashboard/FloatingShapes';
import { classOpenAIConfigService, ClassConfig } from '@/services/classOpenAIConfig';
import { formatFileSize } from '@/lib/utils';
import { useNavigate } from 'react-router-dom'; // --- MODIFICATION: Import useNavigate

const Footer = () => (
  <footer className="relative z-10 w-full px-4 py-6 md:px-9 lg:px-10 border-t border-neutral-800 bg-neutral-900 flex-shrink-0">
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
    const navigate = useNavigate(); // --- MODIFICATION: Initialize navigate
    const [isWelcomePopupOpen, setIsWelcomePopupOpen] = useState(false);
    
    const [classes, setClasses] = useState<ClassConfig[]>([]);
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);

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
        const fetchProfileAndClasses = async () => {
        if (user) {
            setIsLoadingClasses(true);
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
            
            try {
                const fetchedClasses = await classOpenAIConfigService.getAllClasses();
                setClasses(fetchedClasses);
            } catch (classError) {
                console.error("Error fetching classes:", classError);
            } finally {
                setIsLoadingClasses(false);
            }

        } else {
            setClasses([]);
            setIsLoadingClasses(false);
        }
        };
        fetchProfileAndClasses();
    }, [user]);

    const classesWithStats = useMemo(() => {
        if (!classes || !user) return [];
        return classes.map(cls => ({ 
            ...cls, 
            files: cls.file_count || 0,
            size: formatFileSize(cls.total_size || 0),
            is_owner: cls.owner_id === user.id,
            is_shared: (cls.member_count || 0) > 1
        }));
    }, [classes, user]);

    // --- MODIFICATION: New handler for class card clicks ---
    const handleClassCardClick = (classData: ClassConfig) => {
        if (user) {
            navigate('/classes', { state: { selectedClass: classData } });
        } else {
            navigate('/auth');
        }
    };

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
        
        <main className="relative flex h-full w-full flex-grow flex-col overflow-y-auto rounded-lg border border-foreground/20 bg-neutral-900">
          <FloatingShapes />
          
          <div className="relative z-10 flex flex-col flex-grow">
            <div className="flex-grow p-4 md:p-8 flex flex-col">
                <div className="max-w-4xl mx-auto text-center flex-shrink-0">
                    <h1 className="text-4xl font-bold text-neutral-100">Hello{profile?.full_name ? `, ${profile.full_name}` : '!'}</h1>
                    <p className="mt-2 text-neutral-400">
                        Eido AI translates your coursework for intelligent tools. Start by going to classes or by exploring the tools below.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 flex-grow">
                    <OracleCard onClick={() => handleProtectedLinkClick('/oracle')} />
                    <ClassesCard 
                        onClick={() => handleProtectedLinkClick('/classes')} 
                        classes={classesWithStats}
                        isLoading={isLoadingClasses}
                        // --- MODIFICATION: Pass the new handler ---
                        onClassClick={handleClassCardClick}
                    />
                </div>
            </div>
            <Footer />
          </div>
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