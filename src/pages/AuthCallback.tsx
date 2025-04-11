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
        // 1. Get session from URL (after redirect from Supabase)
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          throw sessionError;
        }

        if (!session) {
          const params = new URLSearchParams(window.location.search);
          const errorDescription = params.get("error_description");
          throw new Error(errorDescription || "Authentication failed - no session established");
        }

        const user = session.user;

        // 2. Check if user exists in 'users' table
        const { data: userExists, error: userCheckError } = await supabase
          .from("users")
          .select("id")
          .eq("id", user.id)
          .single();

        // Allow "Row not found" error (code PGRST116), ignore it
        if (userCheckError && userCheckError.code !== "PGRST116") {
          throw userCheckError;
        }

        // 3. Insert user if they don't exist
        if (!userExists && userCheckError?.code === "PGRST116") {
          const { error: createError } = await supabase.from("users").insert([
            {
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || "",
              created_at: new Date().toISOString(),
              last_active_at: new Date().toISOString(),
            },
          ]);

          if (createError) throw createError;
        }

        // 4. Ensure profile exists or update onboarding status
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: user.email,
            onboarding_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

        if (profileError) {
          console.error("Error creating profile:", profileError);
        }

        // 5. Fetch onboarding status from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        // 6. Navigate based on onboarding status
        navigate(profile?.onboarding_completed ? "/dashboard" : "/onboarding", {
          replace: true,
        });
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
