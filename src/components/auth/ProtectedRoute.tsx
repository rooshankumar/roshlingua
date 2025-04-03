
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
      if (!user) return;

      // Check profile completion in profiles table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('full_name, gender, native_language, learning_language, proficiency_level, learning_goal, onboarding_completed')
        .eq('id', user.id)
        .single();

      if (!userError && userData) {
        const requiredFields = ['full_name', 'gender', 'native_language', 'learning_language', 'proficiency_level', 'learning_goal'];
        const isComplete = requiredFields.every(field => !!userData[field]) || userData.onboarding_completed;
        setHasCompletedOnboarding(isComplete);
      }

      if (!profileError && profileData) {
        const requiredFields = ['full_name', 'gender', 'native_language', 'learning_language', 'proficiency_level', 'learning_goal'];
        const isComplete = requiredFields.every(field => !!profileData[field]) || profileData.onboarding_completed;
        setHasCompletedOnboarding(isComplete);
      }

      setIsCheckingOnboarding(false);
    };

    checkOnboardingStatus();
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

  // Redirect to onboarding if not completed, except if already on onboarding page
  if (!hasCompletedOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // If on onboarding page but has completed it, redirect to dashboard
  if (hasCompletedOnboarding && location.pathname === "/onboarding") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
