
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setIsCheckingOnboarding(false);
        return;
      }

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Error checking onboarding status:", profileError);
        }

        const isCompleted = profileData?.onboarding_completed || false;
        setHasCompletedOnboarding(isCompleted);
      } catch (error) {
        console.error("Error in onboarding check:", error);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    if (user) {
      checkOnboardingStatus();
    }
  }, [user]);

  if (isLoading || isCheckingOnboarding) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20"></div>
          <div className="h-2 w-24 rounded-full bg-primary/20"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  // Only handle redirects when not checking onboarding status
  if (!isCheckingOnboarding) {
    const isOnOnboardingPage = location.pathname === "/onboarding";
    
    if (!hasCompletedOnboarding && !isOnOnboardingPage) {
      return <Navigate to="/onboarding" replace />;
    }

    if (hasCompletedOnboarding && isOnOnboardingPage) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
