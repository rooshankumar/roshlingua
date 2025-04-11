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
        const code = new URLSearchParams(window.location.search).get('code');
        if (!code) throw new Error('No code provided');

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) throw error;

        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', data.session?.user.id)
          .single();

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