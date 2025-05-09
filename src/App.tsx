import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import HMRHandler from '@/components/HMRHandler';


// Pages
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import Community from "./pages/Community";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import ChatList from "./pages/ChatList";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import LanguageGuides from "./pages/LanguageGuides";
import FAQ from "./pages/FAQ";

// Components
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./components/layouts/AppLayout";
import AuthLayout from "./components/layouts/AuthLayout";
import { RealtimeStatus } from './components/RealtimeStatus';
import RealtimeConnectionCheck from './components/RealtimeConnectionCheck';


const queryClient = new QueryClient();

// The AuthCodeHandler component is imported and handles OAuth code parameters
import AuthCodeHandler from "./components/auth/AuthCodeHandler";


const AppRoutes = () => {
  const { user, isLoading } = useAuth();

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
    <>
      <AuthCodeHandler />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={
          <AuthLayout>
            {user ? <Navigate to="/dashboard" replace /> : <Auth />}
          </AuthLayout>
        } />

        {/* Auth callback routes for OAuth - support both paths for compatibility */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/callback" element={<AuthCallback />} />

        {/* Protected routes with AppLayout */}
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <Onboarding onComplete={() => {
              localStorage.setItem("onboarding_completed", "true");
              window.location.href = "/dashboard";
            }} />
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <AppLayout>
              <Profile />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/profile/:id" element={
          <ProtectedRoute>
            <AppLayout>
              <Profile />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/community" element={
          <ProtectedRoute>
            <AppLayout>
              <Community />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute>
            <AppLayout>
              <ChatList />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/chat/:conversationId" element={
          <ProtectedRoute>
            <AppLayout>
              <Chat />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <AppLayout>
              <Settings />
            </AppLayout>
          </ProtectedRoute>
        } />


        {/* Legal pages */}
        <Route path="/privacy-policy" element={<AuthLayout><PrivacyPolicy /></AuthLayout>} />
        <Route path="/terms" element={<AuthLayout><Terms /></AuthLayout>} />
        <Route path="/contact" element={<AuthLayout><Contact /></AuthLayout>} />
        
        {/* Resources */}
        <Route path="/blog" element={<AuthLayout><Blog /></AuthLayout>} />
        <Route path="/language-guides" element={<AuthLayout><LanguageGuides /></AuthLayout>} />
        <Route path="/faq" element={<AuthLayout><FAQ /></AuthLayout>} />
        
        {/* Catch all for 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
            <Toaster />
            <HMRHandler /> {/* Added HMR handler */}
            <Analytics debug={false} />
            <SpeedInsights debug={false} />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;