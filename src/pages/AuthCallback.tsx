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
        // ✅ Use full URL for PKCE flow
        const { data: sessionData, error: sessionError } =
          await supabase.auth.exchangeCodeForSession(window.location.href);

        if (sessionError || !sessionData.session) {
          throw new Error(sessionError?.message || "Failed to establish session.");
        }

        const userId = sessionData.session.user.id;

        // ✅ Fetch profile with user_id
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("user_id", userId)
          .single();

        if (profileError) {
          console.error("Profile fetch error:", profileError);
          throw new Error("Could not load profile information.");
        }

        // ✅ Redirect accordingly
        const redirectTo = profile?.onboarding_completed ? "/dashboard" : "/onboarding";
        navigate(redirectTo, { replace: true });

      } catch (error: any) {
        console.error("Auth callback error:", error);
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: error.message || "Something went wrong during login.",
        });

        // Redirect to login after brief delay
        setTimeout(() => {
          navigate("/auth", { replace: true });
        }, 2000);
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Completing authentication...</h2>
        <p className="text-muted-foreground">Please wait while we log you in.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
