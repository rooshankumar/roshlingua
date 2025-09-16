
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
        // Try to get onboarding status with exponential backoff
        let onboardingData: { is_complete: boolean } | null = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            const { data, error } = await supabase
              .from('onboarding_status')
              .select('is_complete')
              .eq('user_id', user.id)
              .single();
              
            if (error) {
              // If row not found, create a default onboarding_status
              if (error.code === 'PGRST116') {
                console.log(`Onboarding status not found (attempt ${retryCount + 1}), creating a new onboarding_status`);
                
                // Create a new onboarding_status row
                const { error: createError } = await supabase
                  .from('onboarding_status')
                  .insert({
                    user_id: user.id,
                    is_complete: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  });
                  
                if (createError) {
                  console.error(`Error creating onboarding_status (attempt ${retryCount + 1}):`, createError);
                  retryCount++;
                  
                  // Add exponential backoff delay
                  await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
                  continue;
                }
                
                // After creating, fetch again
                const { data: newData, error: newError } = await supabase
                  .from('onboarding_status')
                  .select('is_complete')
                  .eq('user_id', user.id)
                  .single();
                  
                if (newError) {
                  console.error(`Error fetching new onboarding_status (attempt ${retryCount + 1}):`, newError);
                  retryCount++;
                  
                  // Add exponential backoff delay
                  await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
                  continue;
                }
                
                onboardingData = newData as any;
                break;
              } else {
                console.error(`Error checking onboarding status (attempt ${retryCount + 1}):`, error);
                retryCount++;
                
                // Add exponential backoff delay
                await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
                continue;
              }
            } else {
              onboardingData = data as any;
              break;
            }
          } catch (innerError) {
            console.error(`Unexpected error in profile check (attempt ${retryCount + 1}):`, innerError);
            retryCount++;
            
            // Add exponential backoff delay
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
          }
        }
        
        if (onboardingData) {
          const isCompleted = onboardingData.is_complete || false;
          console.log("Onboarding status:", isCompleted ? "Completed" : "Not completed");
          setHasCompletedOnboarding(isCompleted);
        } else {
          console.log("Failed to retrieve or create profile after retries, defaulting to onboarding");
          setHasCompletedOnboarding(false);
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

  // Optional onboarding: do not block access if not completed.
  // If user has completed onboarding and is on the onboarding page, redirect them to dashboard.
  if (!isCheckingOnboarding) {
    const isOnOnboardingPage = location.pathname === "/onboarding";
    if (hasCompletedOnboarding && isOnOnboardingPage) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
