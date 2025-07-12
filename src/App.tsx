// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/auth/AuthGuard";
import { HelmetProvider } from 'react-helmet-async';
import { LoaderProvider } from './context/LoaderContext'; 
// MODIFICATION: Import the new AuthProvider
import { AuthProvider } from './context/AuthContext';

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

const queryClient = new QueryClient();
const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {/* MODIFICATION: AuthProvider now wraps the entire application */}
        <AuthProvider>
          <BrowserRouter>
            <LoaderProvider>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<DashboardPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />

                {/* Protected routes */}
                <Route element={<AuthGuard />}>
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/oracle" element={<OraclePage />} />
                  <Route path="/classes" element={<ClassesPage/>} />
                  {/* Placeholder routes */}
                  <Route path="/command" element={<PlaceholderPage pageName="Command" />} />
                  <Route path="/calendar" element={<PlaceholderPage pageName="Calendar" />} />
                  <Route path="/billing" element={<PlaceholderPage pageName="Billing" />} />
                  <Route path="/chrono" element={<PlaceholderPage pageName="Chrono" />} />
                  <Route path="/codex" element={<PlaceholderPage pageName="Codex" />} />
                </Route>

                {/* Catch-all 404 route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </LoaderProvider>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);
export default App;