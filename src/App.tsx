import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthPage from "@/pages/AuthPage";
import Index from "@/pages/Index";
import Landing from "@/pages/Landing";
import Metricas from "@/pages/Metricas";
import Leads from "@/pages/Leads";
import FollowUp from "@/pages/FollowUp";
import Oportunidades from "@/pages/Oportunidades";
import Agendamentos from "@/pages/Agendamentos";
import WhatsApp from "@/pages/WhatsApp";
import Conversas from "@/pages/Conversas";
import Configuracoes from "@/pages/Configuracoes";
import Logs from "@/pages/Logs";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import AcceptInvite from "@/pages/AcceptInvite";
import AcceptInviteAfterRegister from "@/pages/AcceptInviteAfterRegister";
import EmailConfirmationPage from "@/pages/EmailConfirmationPage";
import NotFound from "@/pages/NotFound";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminRoute } from "@/components/SuperAdminRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  console.log("App component rendering...");
  
  return (
    <React.Fragment>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/super-admin" element={<ProtectedRoute><SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute></ProtectedRoute>} />
                <Route path="/metricas" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
                <Route path="/follow-up" element={<ProtectedRoute><FollowUp /></ProtectedRoute>} />
                <Route path="/oportunidades" element={<ProtectedRoute><Oportunidades /></ProtectedRoute>} />
                <Route path="/agendamentos" element={<ProtectedRoute><Agendamentos /></ProtectedRoute>} />
                <Route path="/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
                <Route path="/conversas" element={<ProtectedRoute><Conversas /></ProtectedRoute>} />
                <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
                <Route path="/accept-invite" element={<AcceptInvite />} />
                <Route path="/logs" element={<ProtectedRoute><SuperAdminRoute><Logs /></SuperAdminRoute></ProtectedRoute>} />
                <Route path="/accept-invite-after-register" element={<AcceptInviteAfterRegister />} />
                <Route path="/auth/confirm" element={<EmailConfirmationPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </React.Fragment>
  );
};

export default App;
