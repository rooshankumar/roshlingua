
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const code = new URLSearchParams(window.location.search).get("code");
        if (!code) throw new Error("No authorization code found");

        const { data: sessionData, error: sessionError } = 
          await supabase.auth.exchangeCodeForSession(code);

        if (sessionError || !sessionData.session) {
          throw new Error(sessionError?.message || "Failed to establish session");
        }

        const userId = sessionData.session.user.id;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", userId)
          .single();

        if (profileError) {
          await supabase.from("profiles").insert([{ id: userId }]);
          return navigate("/onboarding", { replace: true });
        }

        const redirectTo = profile?.onboarding_completed ? "/dashboard" : "/onboarding";
        navigate(redirectTo, { replace: true });

      } catch (error: any) {
        console.error("Auth error:", error);
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: error.message || "Something went wrong",
        });
        navigate("/auth", { replace: true });
      }
    };

    handleAuth();
  }, [navigate, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <h2 className="text-2xl font-semibold">Signing you in...</h2>
        <p className="text-muted-foreground">Please wait while we verify your account</p>
      </div>
    </div>
  );
};

export default AuthCallback;
