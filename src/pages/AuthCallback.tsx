// app/auth/callback/page.tsx or pages/auth/callback.tsx (depending on your routing system)
"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // ✅ Next.js router
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast"; // your own toast hook

const AuthCallback = () => {
  const router = useRouter();
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

        // ✅ Redirect using Next.js router
        router.replace(profile?.onboarding_completed ? "/dashboard" : "/onboarding");

      } catch (error: any) {
        console.error("Auth callback error:", error);
        setError(error.message);

        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Failed to complete authentication.",
        });

        router.replace("/auth");
      }
    };

    handleAuthCallback();
  }, [router, toast]);

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
