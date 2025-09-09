// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/auth/AuthGuard";
import { HelmetProvider } from 'react-helmet-async';
import { LoaderProvider } from './context/LoaderContext'; 
import { AuthProvider } from './context/AuthContext';
import { Analytics } from "@vercel/analytics/react"; // <-- 1. ADD THIS IMPORT

// Import all active page components
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import OraclePage from "./pages/OraclePage";
import ClassesPage from "./pages/ClassesPage.tsx";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import CalendarPage from "./pages/CalendarPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import OpenInBrowser from './pages/OpenInBrowser';

const queryClient = new QueryClient();
const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <LoaderProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<DashboardPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/open-in-browser" element={<OpenInBrowser />} />

                {/* Protected routes */}
                <Route element={<AuthGuard />}>
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/oracle" element={<OraclePage />} />
                  <Route path="/classes" element={<ClassesPage/>} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/assignments" element={<AssignmentsPage />} />
                  
                  {/* Placeholder routes */}
                  <Route path="/command" element={<PlaceholderPage pageName="Command" />} />
                  <Route path="/billing" element={<PlaceholderPage pageName="Billing" />} />
                  <Route path="/chrono" element={<PlaceholderPage pageName="Chrono" />} />
                  <Route path="/codex" element={<PlaceholderPage pageName="Codex" />} />
                </Route>

                {/* Catch-all 404 route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </LoaderProvider>
          </BrowserRouter>
          <Analytics /> {/* <-- 2. ADD THIS COMPONENT */}
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);
export default App;