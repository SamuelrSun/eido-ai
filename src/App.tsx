
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import HomePage from "./pages/HomePage";
import SuperStu from "./pages/SuperStu";
import SecureCoach from "./pages/SecureCoach";
import StaticCoach from "./pages/StaticCoach";
import PolicyCenter from "./pages/PolicyCenter";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
import NotFound from "./pages/NotFound";
import UploadPage from "./pages/UploadPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import QuizzesPage from "./pages/QuizzesPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="super-stu" element={<SuperStu />} />
            <Route path="secure-coach" element={<SecureCoach />} />
            <Route path="static-coach" element={<StaticCoach />} />
            <Route path="policy-center" element={<PolicyCenter />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="flashcards" element={<FlashcardsPage />} />
            <Route path="quizzes" element={<QuizzesPage />} />
            <Route path="admin" element={<div className="p-8">Admin Panel Coming Soon</div>} />
            <Route path="auth" element={<AuthPage />} />
            <Route path="account" element={<AccountPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
