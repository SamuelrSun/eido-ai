
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthGuard } from "./components/auth/AuthGuard";
import { WidgetsProvider } from "./hooks/use-widgets";
import HomePage from "./pages/HomePage";
import SuperTutor from "./pages/SuperTutor";
import SecureCoach from "./pages/SecureCoach";
import StaticCoach from "./pages/StaticCoach";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
import NotFound from "./pages/NotFound";
import DatabasePage from "./pages/DatabasePage";
import UploadPage from "./pages/UploadPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import QuizzesPage from "./pages/QuizzesPage";
import QuizSessionPage from "./pages/QuizSessionPage";
import CalendarPage from "./pages/CalendarPage";
import CybersecurityCoach from "./pages/CybersecurityCoach";
import PracticePage from "./pages/PracticePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <WidgetsProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Protected routes */}
            <Route element={<AuthGuard />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/super-tutor" element={<SuperTutor />} />
                <Route path="/super-stu" element={<Navigate to="/super-tutor" replace />} />
                <Route path="/secure-coach" element={<SecureCoach />} />
                <Route path="/static-coach" element={<StaticCoach />} />
                <Route path="/database" element={<DatabasePage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/flashcards" element={<FlashcardsPage />} />
                <Route path="/quizzes" element={<QuizzesPage />} />
                <Route path="/quizzes/:quizId" element={<QuizSessionPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/cybersecurity-coach" element={<CybersecurityCoach />} />
                <Route path="/practice" element={<PracticePage />} />
              </Route>
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </WidgetsProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
