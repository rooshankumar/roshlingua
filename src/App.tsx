
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";

// Pages
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";

// Layouts and providers
import AuthLayout from "./components/layouts/AuthLayout";
import DashboardLayout from "./components/layouts/DashboardLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(false);
  
  // For demo purposes, manually set authentication status
  // In a real app, this would come from an auth provider/context
  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem("auth_token");
      setIsAuthenticated(!!token);
      
      const onboardingStatus = localStorage.getItem("onboarding_complete");
      setIsOnboardingComplete(!!onboardingStatus);
    };
    
    checkAuthStatus();
  }, []);
  
  const handleLogin = () => {
    localStorage.setItem("auth_token", "demo_token");
    setIsAuthenticated(true);
  };
  
  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    setIsAuthenticated(false);
  };
  
  const completeOnboarding = () => {
    localStorage.setItem("onboarding_complete", "true");
    setIsOnboardingComplete(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/contact" element={<Contact />} />
              
              {/* Auth routes */}
              <Route path="/auth" element={
                <AuthLayout>
                  <Auth onLogin={handleLogin} />
                </AuthLayout>
              } />
              
              {/* Onboarding route - accessible only if authenticated but onboarding not complete */}
              <Route path="/onboarding" element={
                <ProtectedRoute isAuthenticated={isAuthenticated}>
                  {isOnboardingComplete ? 
                    <Navigate to="/dashboard" replace /> : 
                    <Onboarding onComplete={completeOnboarding} />
                  }
                </ProtectedRoute>
              } />
              
              {/* Protected routes - accessible only if authenticated and onboarding complete */}
              <Route path="/dashboard" element={
                <ProtectedRoute isAuthenticated={isAuthenticated && isOnboardingComplete}>
                  <DashboardLayout onLogout={handleLogout}>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/community" element={
                <ProtectedRoute isAuthenticated={isAuthenticated && isOnboardingComplete}>
                  <DashboardLayout onLogout={handleLogout}>
                    <Community />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/profile/:id" element={
                <ProtectedRoute isAuthenticated={isAuthenticated && isOnboardingComplete}>
                  <DashboardLayout onLogout={handleLogout}>
                    <Profile />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/chat/:id" element={
                <ProtectedRoute isAuthenticated={isAuthenticated && isOnboardingComplete}>
                  <DashboardLayout onLogout={handleLogout}>
                    <Chat />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute isAuthenticated={isAuthenticated && isOnboardingComplete}>
                  <DashboardLayout onLogout={handleLogout}>
                    <Settings onLogout={handleLogout} />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              
              {/* Catch all for 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
