
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
        console.log("No user available, skipping onboarding check");
        setIsCheckingOnboarding(false);
        return;
      }

      console.log("Checking onboarding status for user:", user.id);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error("Error checking onboarding status:", profileError);
          
          // If profile not found, create a default one
          if (profileError.code === 'PGRST116') {
            console.log("Profile not found, creating a new profile");
            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                email: user.email,
                onboarding_completed: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (createError) {
              console.error("Error creating profile:", createError);
            }
          }
          
          setHasCompletedOnboarding(false);
        } else {
          const isCompleted = profileData?.onboarding_completed || false;
          console.log("Onboarding status:", isCompleted ? "Completed" : "Not completed");
          setHasCompletedOnboarding(isCompleted);
        }
      } catch (error) {
        console.error("Error in onboarding check:", error);
        setHasCompletedOnboarding(false);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    if (user) {
      checkOnboardingStatus();
    } else {
      setIsCheckingOnboarding(false);
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
