// src/components/layout/MainAppLayout.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';
import { Header } from './Header'; // Import the new centralized Header component

interface MainAppLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  showFooter?: boolean; // New prop to conditionally show the footer
}

// Define the Footer component
const Footer = () => (
  <footer className="w-full mt-auto px-4 py-6 md:px-9 lg:px-10 border-t border-marble-400 bg-marble-100 flex-shrink-0">
    <div className="flex flex-col md:flex-row justify-between items-center text-sm text-volcanic-800">
      <span>© 2025 Eido AI. All rights reserved.</span>
      <div className="flex gap-x-4 mt-4 md:mt-0">
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-volcanic-900 hover:underline">Privacy Policy</a>
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-volcanic-900 hover:underline">Terms of Service</a>
      </div>
    </div>
  </footer>
);

export const MainAppLayout = ({ children, pageTitle, showFooter = false }: MainAppLayoutProps) => {
  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <link rel="canonical" href="https://www.eido-ai.com/" /> 
        <meta name="viewport" content="initial-scale=1.0, width=device-width, viewport-fit=cover, maximum-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        {/* Re-adding essential inline styles to avoid layout breakage.
            Ideally, these should be systematically moved to global CSS (src/index.css or tailwind.config.ts)
            and applied via Tailwind utility classes. */}
        <style type="text/css">{`
          :root { --volcanic: #212121; --marble: #fafafa; --green: #39594d; --coral: #ff7759; }
          html, body { font-family: "Trebuchet MS", sans-serif; }
          
          .bg-mushroom-100 { background-color: #75909C; } .mx-auto { margin-left: auto; margin-right: auto; }
          .flex { display: flex; } .h-screen { height: 100vh; } .w-screen { width: 100vw; }
          .max-w-page { max-width: 1440px; } .flex-1 { flex: 1 1 0%; } .flex-col { flex-direction: column; }
          .overflow-y-auto { overflow-y: auto; } .m-3 { margin: 0.75rem; } .z-navigation { z-index: 50; }
          .w-full { width: 100%; } 
          .items-center { align-items: center; } .justify-between { justify-content: space-between; }
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
        <div className="mx-auto flex min-h-screen w-screen max-w-page flex-1 flex-col">
          {/* Render the centralized Header component */}
          <Header />
          {/* Children (the page-specific content) will be rendered here */}
          {children}
          {/* Conditionally render the Footer based on the prop */}
          {showFooter && <Footer />}
        </div>
      </div>
    </>
  );
};