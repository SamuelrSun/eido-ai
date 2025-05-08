
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthGuard } from "./components/auth/AuthGuard";
import HomePage from "./pages/HomePage";
import SuperStu from "./pages/SuperStu";
import SecureCoach from "./pages/SecureCoach";
import StaticCoach from "./pages/StaticCoach";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
import NotFound from "./pages/NotFound";
import UploadPage from "./pages/UploadPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import QuizzesPage from "./pages/QuizzesPage";
import QuizSessionPage from "./pages/QuizSessionPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<AppLayout><AuthPage /></AppLayout>} />
          
          {/* Protected routes */}
          <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
            <Route path="/" element={<HomePage />} />
            <Route path="super-stu" element={<SuperStu />} />
            <Route path="secure-coach" element={<SecureCoach />} />
            <Route path="static-coach" element={<StaticCoach />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="flashcards" element={<FlashcardsPage />} />
            <Route path="quizzes" element={<QuizzesPage />} />
            <Route path="quizzes/:quizId" element={<QuizSessionPage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
