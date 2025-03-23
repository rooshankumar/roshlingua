
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

const AuthCallback = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("Processing auth callback");
        
        // Process the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth callback error:", error);
          throw error;
        }
        
        if (data.session) {
          console.log("Auth successful, redirecting to dashboard");
          toast({
            title: "Login successful",
            description: "Welcome to Languagelandia!",
          });
          
          // Check if user needs onboarding
          const { data: onboardingData } = await supabase
            .from('onboarding_status')
            .select('*')
            .eq('user_id', data.session.user.id)
            .single();
            
          if (onboardingData && !onboardingData.is_complete) {
            navigate('/onboarding', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else {
          console.error("No session found after authentication");
          setError("Authentication failed. Please try again.");
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(err.message || "Authentication failed");
      } finally {
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20"></div>
          <div className="h-2 w-24 rounded-full bg-primary/20"></div>
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

  // If for some reason we get here (we should have redirected already)
  return <Navigate to="/dashboard" replace />;
};

export default AuthCallback;
