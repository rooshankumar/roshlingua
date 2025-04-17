import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import AuthCodeHandler from "@/components/auth/AuthCodeHandler";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Pages
import Home from "@/pages/Home";
import Auth from "@/pages/Auth";
import Callback from "@/pages/auth/callback";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import Chat from "@/pages/Chat";
import ChatList from "@/pages/ChatList";
import Community from "@/pages/Community";
import Contact from "@/pages/Contact";
import Terms from "@/pages/Terms";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import { useAuth } from "@/providers/AuthProvider";
import "@/App.css";

// Create QueryClient instance
const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, isLoading } = useAuth();

  // Show loading indicator - using improved loading indicator from original
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
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <Auth />} />
      <Route path="/auth/callback" element={<Callback />} />
      <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/auth" />} />
      <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/auth" />} />
      <Route path="/profile" element={user ? <Profile /> : <Navigate to="/auth" />} />
      <Route path="/settings" element={user ? <Settings /> : <Navigate to="/auth" />} />
      <Route path="/chat" element={user ? <ChatList /> : <Navigate to="/auth" />} />
      <Route path="/chat/:id" element={user ? <Chat /> : <Navigate to="/auth" />} />
      <Route path="/community" element={user ? <Community /> : <Navigate to="/auth" />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
        <BrowserRouter>
          <AuthProvider>
            <AuthCodeHandler />
            <AppRoutes />
            <Toaster />
            <Analytics debug={false} />
            <SpeedInsights debug={false} />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;