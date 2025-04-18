import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const Callback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("===== AUTH CALLBACK PROCESSING =====");

        // Get auth code from URL
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (!code) {
          console.error("No authentication code in URL");
          throw new Error("Missing authentication code");
        }

        console.log("Found auth code in URL:", code.substring(0, 5) + "...");

        // Get code verifier from localStorage
        const codeVerifier = localStorage.getItem('supabase.auth.code_verifier');
        console.log("Code verifier exists:", !!codeVerifier);

        if (!codeVerifier) {
          console.error("No code verifier found in localStorage");
          throw new Error("Missing authentication verifier");
        }

        console.log("Code verifier length:", codeVerifier.length);
        console.log("Code verifier prefix:", codeVerifier.substring(0, 5) + "...");

        // Exchange code for session
        console.log("Exchanging code for session...");
        const { data, error } = await supabase.auth.exchangeCodeForSession(code, codeVerifier);

        if (error) {
          console.error("Error exchanging code for session:", error);
          throw error;
        }

        if (!data.session) {
          console.error("No session returned from code exchange");
          throw new Error("Authentication failed - no session returned");
        }

        console.log("Successfully authenticated!");

        // Check for existing profile
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', data.session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error("Error fetching profile:", profileError);
          }

          // Create profile if needed
          if (!profile) {
            console.log("Creating new profile for user");
            await supabase.from('profiles').insert({
              id: data.session.user.id,
              email: data.session.user.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_seen: new Date().toISOString(),
              onboarding_completed: false
            });

            navigate('/onboarding', { replace: true });
            return;
          }

          // Update last seen timestamp
          await supabase
            .from('profiles')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', data.session.user.id);

          // Redirect based on onboarding status
          if (profile.onboarding_completed) {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/onboarding', { replace: true });
          }
        } catch (profileError) {
          console.error("Error handling profile:", profileError);
          // Still redirect to dashboard as authentication succeeded
          navigate('/dashboard', { replace: true });
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);

        // Clean up for next attempt
        localStorage.removeItem('supabase.auth.code_verifier');

        toast({
          variant: "destructive", 
          title: "Authentication Failed",
          description: error.message || "Please try logging in again."
        });

        navigate('/auth', { replace: true });
      } finally {
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/20"></div>
        <div className="h-2 w-24 rounded-full bg-primary/20"></div>
        <p className="text-muted-foreground">
          {isProcessing ? "Completing authentication..." : "Redirecting..."}
        </p>
      </div>
    </div>
  );
};

export default Callback;