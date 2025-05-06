
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import CybersecurityCoach from "./pages/CybersecurityCoach";
import StaticCoach from "./pages/StaticCoach";
import SecureCoach from "./pages/SecureCoach";
import PolicyCenter from "./pages/PolicyCenter";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<CybersecurityCoach />} />
            <Route path="static-coach" element={<StaticCoach />} />
            <Route path="secure-coach" element={<SecureCoach />} />
            <Route path="policy-center" element={<PolicyCenter />} />
            <Route path="admin" element={<div className="p-8">Admin Panel Coming Soon</div>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
