import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import HMRHandler from '@/components/HMRHandler';
import React, { Suspense, lazy, useEffect } from 'react';
// Make sure all lazy components are properly imported
import { AnimatePresence } from 'framer-motion';
import PageTransition from "@/components/PageTransition";


// Pages
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
// Lazy-load all pages for better performance and smoother transitions
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Community = lazy(() => import("./pages/Community"));
const Chat = lazy(() => import("./pages/Chat"));
const Settings = lazy(() => import("./pages/Settings"));
const ChatList = lazy(() => import("./pages/ChatList"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));
const Blog = lazy(() => import("./pages/Blog"));
const FAQ = lazy(() => import("./pages/FAQ"));
const LanguageGuides = lazy(() => import("./pages/LanguageGuides"));

// Components
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./components/layouts/AppLayout";
import AuthLayout from "./components/layouts/AuthLayout";
import { RealtimeStatus } from './components/RealtimeStatus';
import RealtimeConnectionCheck from './components/RealtimeConnectionCheck';


const queryClient = new QueryClient();

// The AuthCodeHandler component is imported and handles OAuth code parameters
import AuthCodeHandler from "./components/auth/AuthCodeHandler";

// Define ErrorBoundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex items-center justify-center h-screen">
          <h1 className="text-red-500">Something went wrong.</h1>
        </div>
      );
    }

    return this.props.children;
  }
}


const AppRoutes = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

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
      <AnimatePresence mode="wait" initial={false}>
        <ErrorBoundary>
          <Routes location={location} key={location.pathname}>
            {/* Public routes */}
            <Route path="/" element={<PageTransition><Home /></PageTransition>} />
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
            <Route path="/privacy-policy" element={
              <AuthLayout>
                <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                  <PrivacyPolicy />
                </Suspense>
              </AuthLayout>
            } />
            <Route path="/terms" element={
              <AuthLayout>
                <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                  <Terms />
                </Suspense>
              </AuthLayout>
            } />
            <Route path="/contact" element={
              <AuthLayout>
                <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                  <Contact />
                </Suspense>
              </AuthLayout>
            } />

            {/* Resources */}
            <Route path="/blog" element={
              <AuthLayout>
                <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                  <Blog />
                </Suspense>
              </AuthLayout>
            } />
            <Route path="/language-guides" element={
              <AuthLayout>
                <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                  <LanguageGuides />
                </Suspense>
              </AuthLayout>
            } />
            <Route path="/faq" element={
              <AuthLayout>
                <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
                  <FAQ />
                </Suspense>
              </AuthLayout>
            } />

            {/* Catch all for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </AnimatePresence>
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