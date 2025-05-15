// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthGuard } from "./components/auth/AuthGuard";
import { WidgetsProvider } from "./hooks/use-widgets";
import HomePage from "./pages/HomePage";
import SuperTutor from "./pages/SuperTutor";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
import NotFound from "./pages/NotFound";
// Correctly import FilesPage.tsx from the features directory
import DatabaseFeaturePage from "./features/files/pages/FilesPage"; 
import FlashcardsPage from "./pages/FlashcardsPage";
import QuizzesPage from "./pages/QuizzesPage";
import QuizSessionPage from "./pages/QuizSessionPage";
import React from "react";

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
                <Route path="/" element={<HomePage key="home-main" />} />
                <Route path="/super-stu" element={<SuperTutor />} />
                {/* Use the correctly imported page for the /database route */}
                <Route path="/database" element={<DatabaseFeaturePage />} /> 
                <Route path="/flashcards" element={<FlashcardsPage />} />
                <Route path="/quizzes" element={<QuizzesPage />} />
                <Route path="/quizzes/:quizId" element={<QuizSessionPage />} />
                <Route path="/account" element={<AccountPage />} />
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
