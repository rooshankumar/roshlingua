
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase, createUserRecord } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Process the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        // If we have a session, create the user record
        if (data.session?.user) {
          const user = data.session.user;
          console.log("User authenticated:", user.id);
          
          // Check if this might be a new user from Google OAuth
          try {
            // Extract user information from the user object
            const email = user.email || '';
            const fullName = user.user_metadata.full_name || user.user_metadata.name || email.split('@')[0];
            
            // Create user record in our database tables
            const success = await createUserRecord(user.id, email, fullName);
            
            if (success) {
              console.log("User record created successfully");
            } else {
              console.warn("Failed to create user record, but proceeding with auth");
            }
            
            // After signing in, redirect to onboarding for new users or dashboard for existing
            // Check if onboarding is complete for this user
            const { data: onboardingData } = await supabase
              .from('onboarding_status')
              .select('is_complete')
              .eq('user_id', user.id)
              .single();
              
            if (onboardingData && onboardingData.is_complete) {
              // Redirect to dashboard if onboarding is complete
              navigate('/dashboard', { replace: true });
            } else {
              // Redirect to onboarding if not complete
              navigate('/onboarding', { replace: true });
            }
          } catch (err) {
            console.error("Error in user record creation:", err);
            // Even if user record creation fails, continue with auth
            navigate('/dashboard', { replace: true });
          }
        } else {
          // No session, redirect to login
          navigate('/auth', { replace: true });
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(err.message || "Authentication failed");
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
          <h2 className="font-bold">Authentication Error</h2>
          <p>{error}</p>
        </div>
        <a href="/auth" className="text-primary underline">
          Back to Login
        </a>
      </div>
    );
  }

  // Let the useEffect handle the navigation
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">Redirecting you...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
