// src/pages/DashboardPage.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { User } from 'lucide-react';
import { Link } from 'react-router-dom'; // Import the Link component

const Footer = () => (
  <footer className="w-full mt-auto px-4 py-6 md:px-9 lg:px-10 border-t border-marble-400 bg-marble-100">
    <div className="flex flex-col md:flex-row justify-between items-center text-sm text-volcanic-800">
      <span>© 2025 Eido AI. All rights reserved.</span>
      <div className="flex gap-x-4 mt-4 md:mt-0">
        <Link to="/privacy" className="hover:text-volcanic-900 hover:underline">Privacy Policy</Link>
        <Link to="/privacy" className="hover:text-volcanic-900 hover:underline">Terms of Service</Link>
      </div>
    </div>
  </footer>
);


const DashboardPage = () => {
  return (
    <>
      <Helmet>
           <title>Dashboard | Eido AI</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width, viewport-fit=cover, maximum-scale=1.0" />
        {/* Make sure you have a favicon in your /public folder */}
        <link rel="icon" href="/favicon.ico" />
      
        <style type="text/css">{`
          :root {
           --volcanic: #212121;
            --marble: #fafafa;
            --green: #39594d;
            --coral: #ff7759;
            --coral-light: rgb(255 173 155);
          }
           html, body {
              font-family: "Trebuchet MS", sans-serif;
          }
          .bg-mushroom-100 { background-color: #75909C; }
           .mx-auto { margin-left: auto; margin-right: auto; }
           .flex { display: flex; }
           .h-screen { height: 100vh; }
           .w-screen { width: 100vw; }
           .max-w-page { max-width: 1440px; }
           .flex-1 { flex: 1 1 0%; }
           .flex-col { flex-direction: column; }
           .overflow-y-auto { overflow-y: auto; }
           .m-3 { margin: 0.75rem; }
           .z-navigation { z-index: 50; }
           .w-full { width: 100%; }
           .items-center { align-items: center; }
           .justify-between { justify-content: space-between; }
           .rounded-lg { border-radius: 0.5rem; }
           .border { border-width: 1px; }
           .px-4 { padding-left: 1rem; padding-right: 1rem; }
           .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
           .border-marble-400 { border-color:rgb(176, 197, 206); }
           .bg-marble-100 { background-color: #F8F7F4; }
           .mr-3 { margin-right: 0.75rem; }
           .h-full { height: 100%; }
           .w-24 { width: 6rem; }
           .fill-green-700 { fill: #39594D; }
           .fill-quartz-500 { fill: #A5A39A; }
           .fill-coral-500 { fill: #FF7759; }
           .text-logo { font-size: 1.125rem; line-height: 1.75rem; }
           .lowercase { text-transform: lowercase; }
           .font-variable { font-family: "Trebuchet MS", sans-serif; }
           .ml-1 { margin-left: 0.25rem; }
           .font-light { font-weight: 300; }
           .text-green-700 { color: #39594D; }
           .text-dark-blue { color: #0F2A47; }
           .gap-x-4 { column-gap: 1rem; }
           .gap-y-0 { row-gap: 0; }
           .text-overline { font-size: 0.875rem; line-height: 1.25rem; letter-spacing: 0.05em; }
           .uppercase { text-transform: uppercase; }
           .font-code { font-family: monospace; }
           .font-medium { font-weight: 500; }
           .font-bold { font-weight: 700; }
           .text-volcanic-900 { color: #212121; }
           .text-volcanic-800 { color: #6B7280; }
           .hover\\:text-volcanic-900:hover { color: #212121; }
           .relative { position: relative; }
           .focus\\:rounded:focus { border-radius: 0.25rem; }
           .focus\\:outline:focus { outline-style: solid; }
           .focus\\:outline-1:focus { outline-width: 1px; }
           .focus\\:outline-offset-4:focus { outline-offset: 4px; }
           .focus\\:outline-volcanic-700:focus { outline-color: #424242; }
           .icon-profile { /* Assuming you have an icon font or SVG for this */ }
           .text-icon-md { font-size: 1.25rem; }
           .flex-grow { flex-grow: 1; }
           .justify-self-center { justify-self: center; }
           .pb-3 { padding-bottom: 0.75rem; }
           .main-content { min-height: calc(100vh - 74px); }
           .overflow-y-auto { overflow-y: auto; }
           .mb-8 { margin-bottom: 2rem; }
           .border-b { border-bottom-width: 1px; }
           .bg-cover { background-size: cover; }
           .flex-shrink-0 { flex-shrink: 0; }
           .bg-mushroom-50 { background-color:rgb(243, 243, 243); }
           .bg-\\[url\\(\\/images\\/whiteCellBackground\\.svg\\)\\] { background-image: url(/background1.png); }
           .bg-oracle-section { background-color: #d1d5db; }
           .bg-flashcards-section { background-color:rgb(109, 67, 53); }
           .bg-quizzes-section { background-color: #F8F8F8; }
           .oracle-background-image {
             background-image: url(/background2.png);
             background-size: cover;
             background-repeat: no-repeat;
             background-position: center;
           }
           .pt-6 { padding-top: 1.5rem; }
           .pt-10 { padding-top: 2.5rem; }
           .px-9 { padding-left: 2.25rem; padding-right: 2.25rem; }
           .px-10 { padding-left: 2.5rem; padding-right: 2.5rem; }
           .text-h3-m { font-size: 2.25rem; line-height: 2.5rem; }
           .font-\\[420\\] { font-weight: 420; }
           .mb-6 { margin-bottom: 1.5rem; }
           .text-h5-m { font-size: 1.5rem; line-height: 2rem; }
           .mb-3 { margin-bottom: 0.75rem; }
           .text-p { font-size: 1rem; line-height: 1.5rem; }
           .font-body { font-family: "Trebuchet MS", sans-serif; }
           .pb-6 { padding-bottom: 1.5rem; }
           .pb-10 { padding-bottom: 2.5rem; }
           .min-w-\\[300px\\] { min-width: 300px; }
           .max-h-\\[250px\\] { max-height: 250px; }
           .items-end { align-items: flex-end; }
           .px-4 { padding-left: 1rem; padding-right: 1rem; }
           .gap-y-6 { row-gap: 1.5rem; }
           .p-4 { padding: 1rem; }
           .p-8 { padding: 2rem; }
           .border-blue-200 { border-color:rgb(189, 197, 212); }
           .bg-\\[url\\(\\/images\\/blueCellBackground\\.svg\\)\\] { background-image: url(https://dashboard.cohere.com/images/blueCellBackground.svg); }
           .gap-y-3 { row-gap: 0.75rem; }
           .text-label { font-size: 0.875rem; line-height: 1.25rem; }
           .text-blue-700 { color:rgb(167, 175, 192); }
           .bg-white { background-color: #ffffff; }
           .w-fit { width: fit-content; }
           .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
           .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
           .group:hover .group-hover\\:no-underline { text-decoration: none; }
           .inline-block { display: inline-block; }
           .cursor-pointer { cursor: pointer; }
           .whitespace-nowrap { white-space: nowrap; }
           .underline { text-decoration-line: underline; }
           .focus\\:no-underline:focus { text-decoration-line: none; }
           .text-volcanic-900 { color: #212121; }
           .ml-1 { margin-left: 0.25rem; }
           .icon-arrow-up-right { /* SVG or icon font */ }
           .text-icon-sm { font-size: 0.875rem; }
           .pt-7 { padding-top: 1.75rem; }
           .pb-3 { padding-bottom: 0.75rem; }
           .min-h-cell-md { min-height: 40px; }
           .max-h-cell-md { max-height: 40px; }
           .group\\/cell:hover { /* styles */ }
           .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
           .bg-blue-500 { background-color: #75909C; }
           .-mr-0\\.5 { margin-right: -0.125rem; }
           .w-3 { width: 0.75rem; }
           .rounded-l-\\[6px\\] { border-top-left-radius: 6px; border-bottom-left-radius: 6px; }
           .text-white { color: #ffffff; }
           .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
           .-skew-x-\\[21deg\\] { transform: skewX(-21deg); }
           .w-6 { width: 1.5rem; }
           .rounded-tr-\\[10px\\] { border-top-right-radius: 10px; }
           .rounded-br-\\[4px\\] { border-bottom-right-radius: 4px; }
           .-ml-1 { margin-left: -0.25rem; }
           .grow-0 { flex-grow: 0; }
           .rounded-tl-\\[4px\\] { border-top-left-radius: 4px; }
           .rounded-bl-\\[10px\\] { border-bottom-left-radius: 10px; }
           .-mr-4 { margin-right: -1rem; }
           .px-0 { padding-left: 0; padding-right: 0; }
           .icon-arrow-right { /* SVG or icon font */ }
           .rounded-r-\\[6px\\] { border-top-right-radius: 6px; border-bottom-right-radius: 6px; }
           .h-\\[175px\\] { height: 175px; }
           .lg\\:\\-right-52 { right: -13rem; }
           .xl\\:\\-right-10 { right: -2.5rem; }
           .pt-8 { padding-top: 2rem; }
           .min-w-\\[700px\\] { min-width: 700px; }
           .border-coral-200 { border-color: #FFD2C7; }
           .bg-\\[url\\(\\/images\\/coralCellBackground\\.svg\\)\\] { background-image: url(https://dashboard.cohere.com/images/coralCellBackground.svg); }
           .bg-coral-500 { background-color: #0F2A47; }
           .border-quartz-200 { border-color: #E8E6DE; }
           .bg-\\[url\\(\\/images\\/quartzCellBackground\\.svg\\)\\] { background-image: url(https://dashboard.cohere.com/images/quartzCellBackground.svg); }
           .text-quartz-700 { color: #6B6960; }
           .visited\\:text-quartz-900:visited { color: #3C3B36; }
           .hover\\:text-quartz-900:hover { color: #3C3B36; }
           .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
           .space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: calc(0.75rem * (1 - 0)); margin-bottom: calc(0.75rem * 0); }
           .grid { display: grid; }
           .bg-quartz-700 { background-color: #6B6960; }
           .border-green-200 { border-color: #C7D9D3; }
           .bg-\\[url\\(\\/images\\/greenCellBackground\\.svg\\)\\] { background-image: url(https://dashboard.cohere.com/images/greenCellBackground.svg); }
           .bg-green-700 { background-color: #39594D; }

           @media (min-width: 768px) {
               .md\\:overflow-y-visible { overflow-y: visible; }
               .md\\:hidden { display: none; }
               .md\\:flex { display: flex; }
               .md\\:w-fit { width: fit-content; }
               .md\\:max-w-\\[680px\\] { max-width: 680px; }
               .md\\:gap-x-3 { column-gap: 0.75rem; }
               .md\\:h-\\[calc\\(100vh-74px\\)\\] { height: calc(100vh - 74px); }
               .md\\:ml-0 { margin-left: 0; }
               .md\\:rounded-lg { border-radius: 0.5rem; }
               .md\\:border { border-width: 1px; }
           .md\\:w-42 { width: 10.5rem; }
               .md\\:py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
               .md\\:mb-10 { margin-bottom: 2.5rem; }
               .md\\:flex-row { flex-direction: row; }
           .md\\:w-2\\/3 { width: 66.666667%; }
               .md\\:w-1\\/3 { width: 33.333333%; }
               .md\\:px-9 { padding-left: 2.25rem; padding-right: 2.25rem; }
               .md\\:flex-wrap { flex-wrap: wrap; }
               .md\\:p-8 { padding: 2rem; }
               .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
               .md\\:items-end { align-items: flex-end; }
           }

           @media (min-width: 1024px) {
               .lg\\:gap-x-6 { column-gap: 1.5rem; }
               .lg\\:max-w-\\[820px\\] { max-width: 820px; }
               .lg\\:w-56 { width: 14rem; }
               .lg\\:text-h3 { font-size: 3rem; line-height: 1; }
               .lg\\:px-10 { padding-left: 2.5rem; padding-right: 2.5rem; }
               .lg\\:text-h5 { font-size: 1.875rem; line-height: 2.25rem; }
               .lg\\:-right-52 { right: -13rem; }
           }
           @media (min-width: 1280px) {
               .xl\\:flex-row { flex-direction: row; }
               .xl\\:w-1\\/2 { width: 50%; }
               .xl\\:\\-right-10 { right: -2.5rem; }
             }
         `}</style>
       </Helmet>
       
       <div className="h-full w-full bg-mushroom-100">
         <div className="mx-auto flex h-screen w-screen max-w-page flex-1 flex-col">
           
           <div className="m-3">
             <nav className="z-navigation flex w-full items-center justify-between rounded-lg border border-marble-400 bg-marble-100 px-4 py-3">
               <a data-element="Link" href="/">
                  <div className="mr-3 flex items-baseline" data-component="NavigationLogo">
                   {/* You removed the SVG, so now it's just the text logo */}
                   <span className="text-logo lowercase font-variable ml-1 font-light text-green-700">eido ai</span>
                  </div>
               </a>
                <div className="hidden md:flex flex-row items-center gap-x-4 gap-y-0 lg:gap-x-6 justify-between md:w-fit md:max-w-[680px] lg:max-w-[820px]">
                 <a href="/"><p className="text-overline uppercase font-bold text-volcanic-900">Dashboard</p></a>
                  <a href="/datasets"><p className="text-overline uppercase font-code text-volcanic-800 hover:text-volcanic-900">Datasets</p></a>
                 <a target="_blank" rel="noopener noreferrer" href="https://docs.cohere.com/"><p className="text-overline uppercase font-code text-volcanic-800 hover:text-volcanic-900">Docs</p></a>
                 <a target="_blank" rel="noopener noreferrer" href="#"><p className="text-overline uppercase font-code text-volcanic-800 hover:text-volcanic-900">Community</p></a>
                </div>
             </nav>
            </div>
           <div className="flex w-full flex-grow justify-self-center pb-3 md:gap-x-3 main-content">
             <div className="ml-3 hidden md:flex">
               <div className="flex flex-col justify-between overflow-auto border-marble-400 bg-marble-100 md:rounded-lg md:border md:w-42 w-full lg:w-56 px-4 md:py-6">
                  <nav className="hidden w-full flex-col gap-y-8 md:flex">
                   
                   {/* === PLATFORM SECTION (EDITED) === */}
                  <div className="flex flex-col gap-y-1">
                     <span className="text-overline uppercase font-code font-bold text-dark-blue">Platform</span>
                     <a href="/"><span className="text-p font-body flex items-center py-0.5 text-volcanic-900"><div className="mr-3 h-2 w-2 rounded-full bg-coral-500"></div><span className="font-medium">Dashboard</span></span></a>
                      <a href="/command"><span className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900"><span>Command</span></span></a>
                     <a href="/datasets"><span className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900"><span>Datasets</span></span></a>
                     <a href="/calendar"><span className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900"><span>Calendar</span></span></a>
                    </div>

                   {/* === TOOLKIT SECTION (NEW) === */}
                   <div className="flex flex-col gap-y-1">
                     <span className="text-overline uppercase font-code font-bold text-dark-blue">Tools</span>
                     <a href="/oracle"><span className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900"><span>Oracle</span></span></a>
                     <a href="/chrono"><span className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900"><span>Chrono</span></span></a>
                     <a href="/codex"><span className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900"><span>Codex</span></span></a>
                   </div>

                   {/* === SETTINGS SECTION (EDITED) === */}
                    <div className="flex flex-col gap-y-1">
                   <span className="text-overline uppercase font-code font-bold text-dark-blue">Settings</span>
                   <a href="/billing"><span className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900"><span>Billing</span></span></a>
                      <Link to="/profile"><span className="text-p font-body flex items-center py-0.5 text-volcanic-800 hover:text-volcanic-900"><span>Profile</span></span></Link>
                    </div>
                 </nav>
               </div>
             </div>
              <main className="mx-3 flex h-full w-full flex-grow flex-col overflow-y-auto rounded-lg border border-marble-400 bg-marble-100 md:ml-0">
                <div className="mb-8 border-b border-marble-400 bg-cover md:mb-10 flex-shrink-0 bg-mushroom-50 bg-[url(/images/whiteCellBackground.svg)]">
                 <div className="flex w-full flex-col overflow-hidden md:flex-row">
                 <div className="flex flex-col px-4 pt-10 pb-4 md:w-2/3 md:px-9 md:pt-16 lg:px-10">
                     <p className="text-h3-m lg:text-h2 font-variable font-[420] mb-6 text-volcanic-700">Welcome<span>, Samuel</span>!</p>
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
                       <Link className="w-fit pb-3 pt-7 focus:outline-none disabled:cursor-not-allowed inline-block" to="/oracle">
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
                        </Link>
                     </div>
                    </section>
                   <section className="flex flex-col rounded-lg p-4 md:flex-wrap md:p-8 xl:flex-row overflow-hidden border bg-flashcards-section bg-[url(/images/coralCellBackground.svg)] border-coral-200">
                     <div className="flex flex-col gap-y-3 w-full xl:w-1/2">
                        <h2 className="text-h5-m lg:text-h5 font-variable font-[420]">Flashcards</h2>
                       <p className="text-p font-body">Generate and review flashcard decks from your course materials to test your knowledge and reinforce key concepts.</p>
                        <a className="w-fit pb-3 pt-7 focus:outline-none disabled:cursor-not-allowed inline-block" href="/flashcards">
                           <div className="relative flex grow">
                              <div className="z-10 flex grow gap-x-2.5">
                                    <div className="h-full min-h-cell-md max-h-cell-md flex grow group/cell transition-all">
                                      <span className="bg-coral-500 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right -mr-0.5 w-3 rounded-l-[6px] border-transparent"></span>
                                        <div className="bg-coral-500 text-white h-full min-h-cell-md max-h-cell-md truncate flex grow justify-between items-center transition-colors bg-clip-padding">
                                            <div className="z-10 w-full"><span className="px-2 justify-center flex w-full items-center transition-all"><span className="text-p font-body">Go to Flashcards</span></span></div>
                                          </div>
                                        <span className="bg-coral-500 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right w-6 -skew-x-[21deg] rounded-tr-[10px] rounded-br-[4px] border-transparent"></span>
                                    </div>
                                <div className="h-full min-h-cell-md max-h-cell-md flex grow group/cell transition-all -ml-1 grow-0">
                                      <span className="bg-coral-500 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right w-6 -mr-4 -skew-x-[21deg] rounded-tl-[4px] rounded-bl-[10px] border-transparent"></span>
                                        <div className="bg-coral-500 text-white h-full min-h-cell-md max-h-cell-md truncate flex grow justify-between items-center transition-colors bg-clip-padding">
                                            <div className="z-10 w-full"><span className="px-0 flex items-center transition-all"><i className="icon-default icon-arrow-right text-icon-md text-white"></i></span></div>
                                          </div>
                                        <span className="bg-coral-500 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right -ml-0.5 w-3 rounded-r-[6px] border-transparent"></span>
                                    </div>
                              </div>
                            </div>
                       </a>
                      </div>
                     <div className="hidden h-[175px] w-full md:flex xl:w-1/2">
                          <div className="relative min-w-[700px] items-end pt-8 lg:-right-52 xl:-right-10">
                              <span style={{boxSizing: 'border-box', display: 'block', overflow: 'hidden', width: 'initial', height: 'initial', background: 'none', opacity: 1, border: 0, margin: 0, padding: '42.0266% 0px 0px'}}>
                                  <img alt="Flashcards Interface" src="https://dashboard.cohere.com/_next/static/media/north.2a150633.svg" decoding="async" style={{position: 'absolute', inset: 0, boxSizing: 'border-box', padding: 0, border: 'none', margin: 'auto', display: 'block', width: 0, height: 0, minWidth: '100%', maxWidth: '100%', minHeight: '100%', maxHeight: '100%'}} />
                              </span>
                         </div>
                      </div>
                   </section>
                    <section className="flex flex-col rounded-lg p-4 md:flex-wrap md:p-8 xl:flex-row overflow-hidden border bg-quizzes-section bg-[url(/images/quartzCellBackground.svg)] border-quartz-200">
                      <div className="flex flex-col gap-y-3 w-full xl:w-1/2">
                       <h2 className="text-h5-m lg:text-h5 font-variable font-[420]">Quizzes</h2>
                        <p className="text-p font-body">Create quizzes from your documents to challenge yourself and measure your understanding of the material.</p>
                        <a className="w-fit pb-3 pt-7 focus:outline-none disabled:cursor-not-allowed inline-block" href="/quizzes">
                           <div className="relative flex grow">
                            <div className="z-10 flex grow gap-x-2.5">
                                    <div className="h-full min-h-cell-md max-h-cell-md flex grow group/cell transition-all">
                                      <span className="bg-quartz-700 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right -mr-0.5 w-3 rounded-l-[6px] border-transparent"></span>
                                        <div className="bg-quartz-700 text-white h-full min-h-cell-md max-h-cell-md truncate flex grow justify-between items-center transition-colors bg-clip-padding">
                                            <div className="z-10 w-full"><span className="px-2 justify-center flex w-full items-center transition-all"><span className="text-p font-body">Go to Quizzes</span></span></div>
                                          </div>
                                        <span className="bg-quartz-700 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right w-6 -skew-x-[21deg] rounded-tr-[10px] rounded-br-[4px] border-transparent"></span>
                                    </div>
                                    <div className="h-full min-h-cell-md max-h-cell-md flex grow group/cell transition-all -ml-1 grow-0">
                                      <span className="bg-quartz-700 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right w-6 -mr-4 -skew-x-[21deg] rounded-tl-[4px] rounded-bl-[10px] border-transparent"></span>
                                        <div className="bg-quartz-700 text-white h-full min-h-cell-md max-h-cell-md truncate flex grow justify-between items-center transition-colors bg-clip-padding">
                                            <div className="z-10 w-full"><span className="px-0 flex items-center transition-all"><i className="icon-default icon-arrow-right text-icon-md text-white"></i></span></div>
                                          </div>
                                        <span className="bg-quartz-700 h-full min-h-cell-md max-h-cell-md transition-all bg-clip-padding origin-top-right -ml-0.5 w-3 rounded-r-[6px] border-transparent"></span>
                                    </div>
                               </div>
                            </div>
                       </a>
                     </div>
                        <div className="hidden h-[175px] w-full md:flex xl:w-1/2">
                          <div className="relative min-w-[700px] items-end pt-8 lg:-right-52 xl:-right-10">
                              <span style={{boxSizing: 'border-box', display: 'block', overflow: 'hidden', width: 'initial', height: 'initial', background: 'none', opacity: 1, border: 0, margin: 0, padding: '59.4017% 0px 0px'}}>
                                  <img alt="Quizzes Interface" src="https://dashboard.cohere.com/_next/static/media/playground.ef67511b.svg" decoding="async" style={{position: 'absolute', inset: 0, boxSizing: 'border-box', padding: 0, border: 'none', margin: 'auto', display: 'block', width: 0, height: 0, minWidth: '100%', maxWidth: '100%', minHeight: '100%', maxHeight: '100%'}}/>
                               </span>
                         </div>
                      </div>
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