import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import HMRHandler from '@/components/HMRHandler';
import React, { Suspense, lazy } from "react";


// Pages
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
// Lazy-loaded pages (load on demand)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Community = lazy(() => import("./pages/Community"));
const Chat = lazy(() => import("./pages/Chat"));
const Settings = lazy(() => import("./pages/Settings"));
const ChatList = lazy(() => import("./pages/ChatList"));

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
            <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
              <Onboarding onComplete={() => {
                localStorage.setItem("onboarding_completed", "true");
                window.location.href = "/dashboard";
              }} />
            </Suspense>
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AppLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                <Dashboard />
              </Suspense>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <AppLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                <Profile />
              </Suspense>
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/profile/:id" element={
          <ProtectedRoute>
            <AppLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                <Profile />
              </Suspense>
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/community" element={
          <ProtectedRoute>
            <AppLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                <Community />
              </Suspense>
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute>
            <AppLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                <ChatList />
              </Suspense>
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/chat/:conversationId" element={
          <ProtectedRoute>
            <AppLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                <Chat />
              </Suspense>
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <AppLayout>
              <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                <Settings />
              </Suspense>
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