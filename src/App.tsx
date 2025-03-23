
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/providers/AuthProvider";

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
import { useAuth } from "./providers/AuthProvider";

const queryClient = new QueryClient();

// Auth callback handler component
const AuthCallback = () => {
  const { isAuthenticated, isOnboardingComplete } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to={isOnboardingComplete ? "/dashboard" : "/onboarding"} replace />;
  }
  
  return <Navigate to="/auth" replace />;
};

const AppRoutes = () => {
  const { isAuthenticated, isOnboardingComplete, isLoading, logout, completeOnboarding } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20"></div>
          <div className="h-2 w-24 rounded-full bg-primary/20"></div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/contact" element={<Contact />} />
      
      {/* Auth callback route for OAuth */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Auth routes */}
      <Route path="/auth" element={
        isAuthenticated ? 
          <Navigate to={isOnboardingComplete ? "/dashboard" : "/onboarding"} replace /> :
          <AuthLayout>
            <Auth />
          </AuthLayout>
      } />
      
      {/* Onboarding route - accessible only if authenticated but onboarding not complete */}
      <Route path="/onboarding" element={
        <ProtectedRoute 
          isAuthenticated={isAuthenticated} 
          isOnboardingComplete={true} // We don't check onboarding here since this IS the onboarding page
          requiresOnboarding={false} // Don't require onboarding to be complete for this route
        >
          {isOnboardingComplete ? 
            <Navigate to="/dashboard" replace /> : 
            <Onboarding onComplete={completeOnboarding} />
          }
        </ProtectedRoute>
      } />
      
      {/* Protected routes - accessible only if authenticated and onboarding complete */}
      <Route path="/dashboard" element={
        <ProtectedRoute 
          isAuthenticated={isAuthenticated} 
          isOnboardingComplete={isOnboardingComplete}
        >
          <DashboardLayout onLogout={logout}>
            <Dashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/community" element={
        <ProtectedRoute 
          isAuthenticated={isAuthenticated} 
          isOnboardingComplete={isOnboardingComplete}
        >
          <DashboardLayout onLogout={logout}>
            <Community />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/profile/:id" element={
        <ProtectedRoute 
          isAuthenticated={isAuthenticated} 
          isOnboardingComplete={isOnboardingComplete}
        >
          <DashboardLayout onLogout={logout}>
            <Profile />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/chat/:id" element={
        <ProtectedRoute 
          isAuthenticated={isAuthenticated} 
          isOnboardingComplete={isOnboardingComplete}
        >
          <DashboardLayout onLogout={logout}>
            <Chat />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      <Route path="/settings" element={
        <ProtectedRoute 
          isAuthenticated={isAuthenticated} 
          isOnboardingComplete={isOnboardingComplete}
        >
          <DashboardLayout onLogout={logout}>
            <Settings onLogout={logout} />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      
      {/* Catch all for 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
