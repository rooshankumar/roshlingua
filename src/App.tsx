
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import { NavigationBar } from "@/components/navigation/NavigationBar";
import { cn } from "@/lib/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import RealtimeStatus from "@/components/RealtimeStatus";

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

// Components
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const showNavigation = user && !location.pathname.startsWith("/auth");
  
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
    <div className="min-h-screen bg-background relative">
      {user && <RealtimeStatus />}
      {showNavigation && <NavigationBar />}
      <div className={cn(
        "min-h-screen transition-all duration-200",
        showNavigation && "md:pl-64 pb-16 md:pb-0"
      )}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={
            user ? <Navigate to="/dashboard" replace /> : <Auth />
          } />

          {/* Auth callback route for OAuth */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected routes */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding onComplete={() => console.log("Onboarding completed")} />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          <Route path="/profile/:id" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/community" element={
            <ProtectedRoute>
              <Community />
            </ProtectedRoute>
          } />

          <Route path="/chat/:id" element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />

          {/* Catch all for 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light">
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
