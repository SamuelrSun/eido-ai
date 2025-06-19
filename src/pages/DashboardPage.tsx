// src/pages/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

const Footer = () => (
  <footer className="w-full mt-auto px-4 py-6 md:px-9 lg:px-10 border-t border-marble-400 bg-marble-100">
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
  const navigate = useNavigate();

  // Fetch the current user on component mount to see if they are logged in
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    // Listen for authentication changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // This function checks for a user before navigating to a protected route
  const handleProtectedLinkClick = (path: string) => {
    if (user) {
      navigate(path);
    } else {
      navigate('/auth'); // Redirect to login page if no user
    }
  };

  return (
    <>
      <Helmet>
           <title>Dashboard | Eido AI</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width, viewport-fit=cover, maximum-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <style type="text/css">{`
          :root {
           --volcanic: #212121; --marble: #fafafa; --green: #39594d; --coral: #ff7759;
          }
           html, body { font-family: "Trebuchet MS", sans-serif; }
           .bg-mushroom-100 { background-color: #75909C; } .mx-auto { margin-left: auto; margin-right: auto; }
           .flex { display: flex; } .h-screen { height: 100vh; } .w-screen { width: 100vw; }
           .max-w-page { max-width: 1440px; } .flex-1 { flex: 1 1 0%; } .flex-col { flex-direction: column; }
           .overflow-y-auto { overflow-y: auto; } .m-3 { margin: 0.75rem; } .z-navigation { z-index: 50; }
           .w-full { width: 100%; } .items-center { align-items: center; } .justify-between { justify-content: space-between; }
           .rounded-lg { border-radius: 0.5rem; } .border { border-width: 1px; } .px-4 { padding-left: 1rem; padding-right: 1rem; }
           .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; } .border-marble-400 { border-color:rgb(176, 197, 206); }
           .bg-marble-100 { background-color: #F8F7F4; } .mr-3 { margin-right: 0.75rem; } .h-full { height: 100%; }
           .text-logo { font-size: 1.125rem; line-height: 1.75rem; } .lowercase { text-transform: lowercase; }
           .font-variable { font-family: "Trebuchet MS", sans-serif; } .ml-1 { margin-left: 0.25rem; } .font-light { font-weight: 300; }
           .text-green-700 { color: #39594D; } .text-dark-blue { color: #0F2A47; } .gap-x-4 { column-gap: 1rem; }
           .text-overline { font-size: 0.875rem; line-height: 1.25rem; letter-spacing: 0.05em; } .uppercase { text-transform: uppercase; }
           .font-code { font-family: monospace; } .font-medium { font-weight: 500; } .font-bold { font-weight: 700; }
           .text-volcanic-900 { color: #212121; } .text-volcanic-800 { color: #6B7280; }
           .hover\\:text-volcanic-900:hover { color: #212121; } .flex-grow { flex-grow: 1; } .pb-3 { padding-bottom: 0.75rem; }
           .main-content { min-height: calc(100vh - 74px); } .mb-8 { margin-bottom: 2rem; } .border-b { border-bottom-width: 1px; }
           .bg-cover { background-size: cover; } .flex-shrink-0 { flex-shrink: 0; }
           .bg-\\[url\\(\\/images\\/whiteCellBackground\\.svg\\)\\] { background-image: url(/background1.png); }
           .oracle-background-image { background-image: url(/background2.png); background-size: cover; background-repeat: no-repeat; background-position: center; }
           .pt-10 { padding-top: 2.5rem; } .px-9 { padding-left: 2.25rem; padding-right: 2.25rem; }
           .px-10 { padding-left: 2.5rem; padding-right: 2.5rem; } .text-h3-m { font-size: 2.25rem; line-height: 2.5rem; }
           .font-\\[420\\] { font-weight: 420; } .mb-6 { margin-bottom: 1.5rem; } .text-h5-m { font-size: 1.5rem; line-height: 2rem; }
           .mb-3 { margin-bottom: 0.75rem; } .text-p { font-size: 1rem; line-height: 1.5rem; } .pb-10 { padding-bottom: 2.5rem; }
           .items-end { align-items: flex-end; } .gap-y-6 { row-gap: 1.5rem; } .p-4 { padding: 1rem; }
           .p-8 { padding: 2rem; } .border-blue-200 { border-color:rgb(189, 197, 212); }
           .gap-y-3 { row-gap: 0.75rem; } .text-label { font-size: 0.875rem; line-height: 1.25rem; } .text-blue-700 { color:rgb(167, 175, 192); }
           .bg-white { background-color: #ffffff; } .w-fit { width: fit-content; } .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
           .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; } .inline-block { display: inline-block; }
           .cursor-pointer { cursor: pointer; } .pt-7 { padding-top: 1.75rem; }
           .min-h-cell-md { min-height: 40px; } .max-h-cell-md { max-height: 40px; }
           .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
           .bg-blue-500 { background-color: #75909C; } .-mr-0\\.5 { margin-right: -0.125rem; }
           .w-3 { width: 0.75rem; } .rounded-l-\\[6px\\] { border-top-left-radius: 6px; border-bottom-left-radius: 6px; }
           .text-white { color: #ffffff; } .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
           .-skew-x-\\[21deg\\] { transform: skewX(-21deg); } .w-6 { width: 1.5rem; } .rounded-tr-\\[10px\\] { border-top-right-radius: 10px; }
           .rounded-br-\\[4px\\] { border-bottom-right-radius: 4px; }
           .bg-coral-500 { background-color: #0F2A47; } .bg-quartz-700 { background-color: #6B6960; }
           @media (min-width: 768px) { .md\\:hidden { display: none; } .md\\:flex { display: flex; }
           .md\\:max-w-\\[680px\\] { max-width: 680px; } .md\\:gap-x-3 { column-gap: 0.75rem; } .md\\:ml-0 { margin-left: 0; }
           .md\\:rounded-lg { border-radius: 0.5rem; } .md\\:border { border-width: 1px; } .md\\:w-42 { width: 10.5rem; }
           .md\\:py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; } .md\\:mb-10 { margin-bottom: 2.5rem; }
           .md\\:flex-row { flex-direction: row; } .md\\:w-2\\/3 { width: 66.666667%; } .md\\:w-1\\/3 { width: 33.333333%; }
           .md\\:px-9 { padding-left: 2.25rem; padding-right: 2.25rem; } .md\\:flex-wrap { flex-wrap: wrap; }
           .md\\:p-8 { padding: 2rem; } .md\\:items-end { align-items: flex-end; } }
           @media (min-width: 1024px) { .lg\\:gap-x-6 { column-gap: 1.5rem; } .lg\\:max-w-\\[820px\\] { max-width: 820px; }
           .lg\\:w-56 { width: 14rem; } .lg\\:text-h5 { font-size: 1.875rem; line-height: 2.25rem; } }
         `}</style>
       </Helmet>
       
       <div className="h-full w-full bg-mushroom-100">
         <div className="mx-auto flex h-screen w-screen max-w-page flex-1 flex-col">
           
           <div className="m-3">
             <nav className="z-navigation flex w-full items-center justify-between rounded-lg border border-marble-400 bg-marble-100 px-4 py-3">
               <a href="/">
                  <div className="mr-3 flex items-baseline">
                   <span className="text-logo lowercase font-variable ml-1 font-light text-green-700">eido ai</span>
                  </div>
               </a>
                <div className="hidden md:flex flex-row items-center gap-x-4 lg:gap-x-6">
                 <p className="text-overline uppercase font-bold text-volcanic-900 cursor-pointer">Dashboard</p>
                 <p onClick={() => handleProtectedLinkClick('/datasets')} className="text-overline uppercase font-code text-volcanic-800 hover:text-volcanic-900 cursor-pointer">Datasets</p>
                 <a target="_blank" rel="noopener noreferrer" href="https://docs.cohere.com/"><p className="text-overline uppercase font-code text-volcanic-800 hover:text-volcanic-900">Docs</p></a>
                 <a target="_blank" rel="noopener noreferrer" href="#"><p className="text-overline uppercase font-code text-volcanic-800 hover:text-volcanic-900">Community</p></a>
                </div>
             </nav>
            </div>
           <div className="flex w-full flex-grow justify-self-center pb-3 md:gap-x-3 main-content">
             <div className="ml-3 hidden md:flex">
               <div className="flex flex-col justify-between overflow-auto border-marble-400 bg-marble-100 md:rounded-lg md:border md:w-42 w-full lg:w-56 px-4 md:py-6">
                  <nav className="hidden w-full flex-col gap-y-8 md:flex">
                  <div className="flex flex-col gap-y-1">
                    <span className="text-overline uppercase font-code font-bold text-dark-blue">Platform</span>
                    <span onClick={() => handleProtectedLinkClick('/')} className="text-p font-body flex items-center py-0.5 text-volcanic-900 cursor-pointer"><div className="mr-3 h-2 w-2 rounded-full bg-coral-500"></div><span className="font-medium">Dashboard</span></span>
                     <span onClick={() => handleProtectedLinkClick('/command')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer"><span>Command</span></span>
                    <span onClick={() => handleProtectedLinkClick('/datasets')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer"><span>Datasets</span></span>
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
                  <span onClick={() => handleProtectedLinkClick('/billing')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer"><span>Billing</span></span>
                     <span onClick={() => handleProtectedLinkClick('/profile')} className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900 cursor-pointer"><span>Profile</span></span>
                   </div>
                 </nav>
               </div>
             </div>
              <main className="mx-3 flex h-full w-full flex-grow flex-col overflow-y-auto rounded-lg border border-marble-400 bg-marble-100 md:ml-0">
                <div className="mb-8 border-b border-marble-400 bg-cover md:mb-10 flex-shrink-0 bg-mushroom-50 bg-[url(/images/whiteCellBackground.svg)]">
                 <div className="flex w-full flex-col overflow-hidden md:flex-row">
                 <div className="flex flex-col px-4 pt-10 pb-4 md:w-2/3 md:px-9 md:pt-16 lg:px-10">
                     <p className="text-h3-m lg:text-h2 font-variable font-[420] mb-6 text-volcanic-700">Welcome{user ? `, ${user.email?.split('@')[0] || 'User'}` : ''}!</p>
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
                        <p className="text-p font-body">
                         Eido's central AI chat interface, featuring different modes to assist with your studies. You can ask questions about your uploaded class materials using the RAG-powered "Class AI" or perform general queries with the "Web AI" for supplemental information.
                       </p>
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
                   <section className="flex flex-col rounded-lg p-4 md:flex-wrap md:p-8 xl:flex-row overflow-hidden border bg-flashcards-section bg-[url(/images/coralCellBackground.svg)] border-coral-200">
                     <div className="flex flex-col gap-y-3 w-full xl:w-1/2">
                        <h2 className="text-h5-m lg:text-h5 font-variable font-[420]">Flashcards</h2>
                       <p className="text-p font-body">Generate and review flashcard decks from your course materials to test your knowledge and reinforce key concepts.</p>
                        <div onClick={() => handleProtectedLinkClick('/flashcards')} className="w-fit pb-3 pt-7 focus:outline-none disabled:cursor-not-allowed inline-block cursor-pointer">
                           <div className="relative flex grow">
                              <div className="z-10 flex grow gap-x-2.5">
                                 {/* ... (rest of the decorative button structure) ... */}
                                 <div className="h-full min-h-cell-md max-h-cell-md flex grow group/cell transition-all">
                                      <span className="bg-coral-500 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right -mr-0.5 w-3 rounded-l-[6px] border-transparent"></span>
                                      <div className="bg-coral-500 text-white h-full min-h-cell-md max-h-cell-md truncate flex grow justify-between items-center transition-colors bg-clip-padding">
                                         <div className="z-10 w-full"><span className="px-2 justify-center flex w-full items-center transition-all"><span className="text-p font-body">Go to Flashcards</span></span></div>
                                      </div>
                                      <span className="bg-coral-500 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right w-6 -skew-x-[21deg] rounded-tr-[10px] rounded-br-[4px] border-transparent"></span>
                                 </div>
                              </div>
                           </div>
                        </div>
                      </div>
                      {/* ... (rest of the decorative image section) ... */}
                   </section>
                    <section className="flex flex-col rounded-lg p-4 md:flex-wrap md:p-8 xl:flex-row overflow-hidden border bg-quizzes-section bg-[url(/images/quartzCellBackground.svg)] border-quartz-200">
                      <div className="flex flex-col gap-y-3 w-full xl:w-1/2">
                       <h2 className="text-h5-m lg:text-h5 font-variable font-[420]">Quizzes</h2>
                        <p className="text-p font-body">Create quizzes from your documents to challenge yourself and measure your understanding of the material.</p>
                        <div onClick={() => handleProtectedLinkClick('/quizzes')} className="w-fit pb-3 pt-7 focus:outline-none disabled:cursor-not-allowed inline-block cursor-pointer">
                           <div className="relative flex grow">
                            <div className="z-10 flex grow gap-x-2.5">
                               {/* ... (rest of the decorative button structure) ... */}
                               <div className="h-full min-h-cell-md max-h-cell-md flex grow group/cell transition-all">
                                 <span className="bg-quartz-700 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right -mr-0.5 w-3 rounded-l-[6px] border-transparent"></span>
                                 <div className="bg-quartz-700 text-white h-full min-h-cell-md max-h-cell-md truncate flex grow justify-between items-center transition-colors bg-clip-padding">
                                     <div className="z-10 w-full"><span className="px-2 justify-center flex w-full items-center transition-all"><span className="text-p font-body">Go to Quizzes</span></span></div>
                                   </div>
                                 <span className="bg-quartz-700 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right w-6 -skew-x-[21deg] rounded-tr-[10px] rounded-br-[4px] border-transparent"></span>
                               </div>
                            </div>
                           </div>
                       </div>
                     </div>
                      {/* ... (rest of the decorative image section) ... */}
                    </section>
                  </div>
               </div>
              </main>
           </div>
           <Footer />
         </div>
       </div>
    </>
  );
};

export default DashboardPage;