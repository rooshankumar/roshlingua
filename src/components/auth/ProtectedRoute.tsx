
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
        // Try multiple times to get or create the profile with exponential backoff
        let profileData = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', user.id)
              .single();
              
            if (error) {
              // If profile not found, create a default one
              if (error.code === 'PGRST116') {
                console.log(`Profile not found (attempt ${retryCount + 1}), creating a new profile`);
                
                // Create a new profile
                const { error: createError } = await supabase
                  .from('profiles')
                  .insert({
                    id: user.id,
                    email: user.email,
                    onboarding_completed: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    last_seen: new Date().toISOString(),
                    is_online: true
                  });
                  
                if (createError) {
                  console.error(`Error creating profile (attempt ${retryCount + 1}):`, createError);
                  retryCount++;
                  
                  // Add exponential backoff delay
                  await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
                  continue;
                }
                
                // After creating, fetch again
                const { data: newData, error: newError } = await supabase
                  .from('profiles')
                  .select('onboarding_completed')
                  .eq('id', user.id)
                  .single();
                  
                if (newError) {
                  console.error(`Error fetching new profile (attempt ${retryCount + 1}):`, newError);
                  retryCount++;
                  
                  // Add exponential backoff delay
                  await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
                  continue;
                }
                
                profileData = newData;
                break;
              } else {
                console.error(`Error checking onboarding status (attempt ${retryCount + 1}):`, error);
                retryCount++;
                
                // Add exponential backoff delay
                await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
                continue;
              }
            } else {
              profileData = data;
              break;
            }
          } catch (innerError) {
            console.error(`Unexpected error in profile check (attempt ${retryCount + 1}):`, innerError);
            retryCount++;
            
            // Add exponential backoff delay
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
          }
        }
        
        if (profileData) {
          const isCompleted = profileData.onboarding_completed || false;
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
        <LoadingSpinner size="md" />
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
