
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the full URL including hash
        const fullUrl = window.location.href;
        
        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(fullUrl);

        if (error) {
          throw error;
        }

        if (!data.session) {
          throw new Error("No session established");
        }

        // Get profile status
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", data.session.user.id)
          .single();

        // Redirect based on onboarding status
        navigate(profile?.onboarding_completed ? "/dashboard" : "/onboarding", { replace: true });

      } catch (error: any) {
        console.error("Auth callback error:", error);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: error.message || "Failed to complete authentication"
        });
        navigate("/auth", { replace: true });
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Completing authentication...</h2>
        <p className="text-muted-foreground">Please wait while we log you in.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
