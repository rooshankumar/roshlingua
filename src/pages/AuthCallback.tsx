import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

// Assuming createUserRecord function is defined in "@/lib/supabase" as mentioned
async function createUserRecord(userId: string, email: string, fullName: string | null, avatarUrl: string | null): Promise<boolean> {
  try {
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error checking existing profile:', fetchError);
      return false;
    }

    if (!existingProfile) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{ id: userId, email: email, full_name: fullName, avatar_url: avatarUrl }]);

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Error in createUserRecord:', error);
    return false;
  }
}

const AuthCallback = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Step 1: Extract tokens from URL fragment
        const hashParams = new URLSearchParams(window.location.hash.substring(1)); // Remove `#`
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const expiresIn = hashParams.get("expires_in");

        if (!accessToken || !refreshToken) {
          throw new Error("Missing authentication tokens.");
        }

        // Step 2: Store session in Supabase
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          throw error;
        }

        // Step 3: Get the user session from Supabase
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData?.user) {
          throw new Error("Failed to retrieve user session.");
        }

        const user = userData.user;
        console.log("User authenticated:", user.id);

        // Extract user info
        const email = user.email || "";
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0];
        const avatarUrl = user.user_metadata?.avatar_url as string | null;

        // Step 4: Save user in database
        const success = await createUserRecord(user.id, email, fullName, avatarUrl);

        if (!success) {
          console.warn("User record creation failed, but proceeding...");
        }

        // Step 5: Redirect user based on onboarding status
        const { data: onboardingData } = await supabase
          .from("onboarding_status")
          .select("is_complete")
          .eq("user_id", user.id)
          .maybeSingle();

        if (onboardingData?.is_complete) {
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/onboarding", { replace: true });
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed.");
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