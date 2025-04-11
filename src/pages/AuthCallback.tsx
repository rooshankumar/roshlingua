
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (sessionError) throw sessionError;
        if (!session) throw new Error("No session established");

        // Get profile status
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", session.user.id)
          .single();

        navigate(profile?.onboarding_completed ? "/dashboard" : "/onboarding", { replace: true });

      } catch (error: any) {
        console.error("Auth callback error:", error);
        setError(error.message);

        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Failed to complete authentication.",
        });

        navigate("/auth", { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500 text-lg">
        Authentication error: {error}
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center text-gray-600 text-lg">
      Completing authentication...
    </div>
  );
};

export default AuthCallback;
