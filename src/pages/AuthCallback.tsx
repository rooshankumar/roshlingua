
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle hash fragment
        if (window.location.hash) {
          const params = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const expiresIn = params.get('expires_in');
          const tokenType = params.get('token_type');

          if (!accessToken) {
            throw new Error('No access token found');
          }

          // Set the session with the token
          const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
            expires_in: parseInt(expiresIn || '3600'),
          });

          if (sessionError) throw sessionError;
          if (!session) throw new Error('No session established');

          // Check if user exists in profiles table
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", session.user.id)
            .single();

          if (profileError && profileError.code === "PGRST116") {
            // Profile doesn't exist, create it
            const { error: insertError } = await supabase
              .from("profiles")
              .insert([{
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name,
                avatar_url: session.user.user_metadata?.avatar_url
              }]);

            if (insertError) throw insertError;
            navigate("/onboarding", { replace: true });
            return;
          }

          if (profileError) throw profileError;

          // Redirect based on onboarding status
          navigate(profileData?.onboarding_completed ? "/dashboard" : "/onboarding", { replace: true });
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
      } finally {
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
