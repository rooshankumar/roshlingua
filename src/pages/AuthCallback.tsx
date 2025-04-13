
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
        // Get the code from URL
        const code = new URL(window.location.href).searchParams.get("code");
        
        if (!code) {
          throw new Error("No code found in URL");
        }

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          throw error;
        }

        if (!data.session) {
          throw new Error("No session returned");
        }

        // Redirect to dashboard on success
        navigate("/dashboard", { replace: true });
      } catch (error: any) {
        console.error("Auth callback error:", error);
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: error.message || "Failed to complete authentication",
        });
        
        // Redirect to login after error
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
