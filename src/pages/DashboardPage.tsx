// src/pages/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { usePageLoader } from '@/context/LoaderContext';
import { MainAppLayout } from '@/components/layout/MainAppLayout';

const DashboardPage = () => {
  // 1. All useState hooks must be called at the top level, before other logic.
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const { loadPage, loader } = usePageLoader();
  const [isLoading, setIsLoading] = useState(true);

  // 2. The first useEffect handles fetching the user and setting up the auth listener.
  useEffect(() => {
    if (loader) {
      loader.complete();
    }
    
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // When auth state changes to logged out, clear the profile
      if (!session?.user) {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loader]);

  // 3. A second, separate useEffect fetches the profile *after* the user object is available.
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
  }, [user]); // This effect depends on the 'user' state

  const handleProtectedLinkClick = (path: string) => {
    if (user) {
      loadPage(path);
    } else {
      loadPage('/auth');
    }
  };

  return (
    // DashboardPage now wraps its content directly in MainAppLayout.
    // The MainAppLayout provides the Header/Navbar and global styling.
    <MainAppLayout pageTitle="Dashboard | Eido AI" showFooter={true}>
      <div className="flex w-full flex-grow justify-self-center pb-3 md:gap-x-3 main-content">
        {/* This sidebar is specific to the DashboardPage, not the main AppSidebar */}
        <div className="ml-3 hidden md:flex">
          <div className="flex flex-col justify-between overflow-auto border-marble-400 bg-marble-100 md:rounded-lg md:border md:w-42 w-full lg:w-56 px-4 md:py-6">
            {/* Removed hardcoded navigation - now handled by centralized Header */}
            <nav className="hidden w-full flex-col gap-y-8 md:flex">
              <div className="flex flex-col gap-y-1">
                <span className="text-overline uppercase font-code font-bold text-dark-blue">Platform</span>
                <span onClick={() => handleProtectedLinkClick('/')} className="text-p font-body flex items-center py-0.5 text-volcanic-900 cursor-pointer"><div className="mr-3 h-2 w-2 rounded-full bg-coral-500"></div><span className="font-medium">Dashboard</span></span>
                <span onClick={() => handleProtectedLinkClick('/classes')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer"><span>Classes</span></span>
                <span onClick={() => handleProtectedLinkClick('/command')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer"><span>Command</span></span>
                <span onClick={() => handleProtectedLinkClick('/calendar')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer"><span>Calendar</span></span>
              </div>
              <div className="flex flex-col gap-y-1">
                <span className="text-overline uppercase font-code font-bold text-dark-blue">Tools</span>
                <span onClick={() => handleProtectedLinkClick('/oracle')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer"><span>Oracle</span></span>
                <span onClick={() => handleProtectedLinkClick('/chrono')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer"><span>Chrono</span></span>
                <span onClick={() => handleProtectedLinkClick('/codex')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer"><span>Codex</span></span>
              </div>
              <div className="flex flex-col gap-y-1">
                <span className="text-overline uppercase font-code font-bold text-dark-blue">Settings</span>
                <span onClick={() => handleProtectedLinkClick('/profile')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer"><span>Profile</span></span>
                <span onClick={() => handleProtectedLinkClick('/billing')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer"><span>Billing</span></span>
              </div>
            </nav>
          </div>
        </div>
        <main className="mx-3 flex h-full w-full flex-grow flex-col overflow-y-auto rounded-lg border border-marble-400 bg-marble-100 md:ml-0">
          <div className="mb-8 border-b border-marble-400 bg-cover md:mb-10 flex-shrink-0 bg-mushroom-50 bg-[url(/images/whiteCellBackground.svg)]">
            <div className="flex w-full flex-col overflow-hidden md:flex-row">
              <div className="flex flex-col px-4 pt-10 pb-4 md:w-2/3 md:px-9 md:pt-16 lg:px-10">
              <p className="text-h3-m lg:text-h2 font-variable font-[420] mb-6 text-volcanic-700">Welcome{user ? `, ${profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'User'}` : ''}!</p>
                <h1 className="text-h5-m lg:text-h4 font-variable font-[420] mb-3 text-volcanic-900">What is Eido AI?</h1>
                <p className="text-p font-body pb-6 text-volcanic-900 md:pb-10">Eido AI is your educational copilot, allowing you to create smart, searchable knowledge bases built on your coursework. Get started with Eido AI by exploring the tools below.</p>
              </div>
              <div className="hidden items-end md:flex md:w-1/3">
                <div className="relative max-h-[250px] min-w-[300px] items-end ">
                  <span style={{boxSizing: "border-box", display: "inline-block", overflow: "hidden", width: "initial", height: "initial", background: "none", opacity: 1, border: 0, margin: 0, padding: 0, position: "relative", maxWidth: "100%"}}>
                    <img alt="" src="https://dashboard.cohere.com/_next/image?url=%2F_next%2Fstatic%2Fmedia%2FdashboardPebbles.73d9a103.png&w=3840&q=75" decoding="async" style={{position: "absolute", top: 0, left: 0, bottom: 0, right: 0, boxSizing: "border-box", padding: 0, border: "none", margin: "auto", display: "block", width: 0, height: 0, minWidth: "100%", maxWidth: "100%", minHeight: "100%", maxHeight: "100%"}} />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-grow px-4 pb-10 md:px-9 lg:px-10">
            <div className="flex h-full w-full flex-col gap-y-6">
              <section className="flex flex-col rounded-lg p-4 md:flex-wrap md:p-8 xl:flex-row overflow-hidden border oracle-background-image border-blue-200">
                <div className="flex flex-col gap-y-3 w-full xl:w-1/2">
                  <div className="text-label uppercase font-code">
                    <span className="text-blue-700 bg-white border border-blue-200 flex w-fit items-center rounded px-2 py-1">New</span>
                  </div>
                  <h2 className="text-h5-m lg:text-h5 font-variable font-[420]">Oracle</h2>
                  <p className="text-p font-body">Eido's central AI chat interface, featuring different modes to assist with your studies. You can ask questions about your uploaded class materials using the RAG-powered "Class AI" or perform general queries with the "Web AI" for supplemental information.</p>
                  <div onClick={() => handleProtectedLinkClick('/oracle')} className="w-fit pb-3 pt-7 focus:outline-none disabled:cursor-not-allowed inline-block cursor-pointer">
                    <div className="relative flex grow">
                      <div className="z-10 flex grow gap-x-2.5">
                        <div className="h-full min-h-cell-md max-h-cell-md flex grow group/cell transition-all">
                          <span className="bg-blue-500 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right -mr-0.5 w-3 rounded-l-[6px] border-transparent"></span>
                          <div className="bg-blue-500 text-white h-full min-h-cell-md max-h-cell-md truncate flex grow justify-between items-center transition-colors bg-clip-padding">
                            <div className="z-10 w-full"><span className="px-2 justify-center flex w-full items-center transition-all"><span className="text-p font-body">Go to Oracle</span></span></div>
                          </div>
                          <span className="bg-blue-500 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right w-6 -skew-x-[21deg] rounded-tr-[10px] rounded-br-[4px] border-transparent"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </MainAppLayout>
  );
};

export default DashboardPage;