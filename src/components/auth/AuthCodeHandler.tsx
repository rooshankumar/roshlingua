import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getPKCEVerifier, clearPKCEVerifier } from '@/utils/pkceHelper';

const AuthCodeHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let mounted = true;

    const handleAuthCallback = async () => {
      if (isProcessing || !mounted) return;
      setIsProcessing(true);

      try {
        console.log("Processing auth callback...");

        // Get the code from URL
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        // Handle error from auth provider
        if (error) {
          console.error("Auth provider error:", error, errorDescription);
          throw new Error(errorDescription || error);
        }

        // Validate we have a code
        if (!code) {
          console.log("No auth code present, redirecting to auth");
          navigate('/auth', { replace: true });
          return;
        }

        // Get the stored PKCE verifier
        const verifier = getPKCEVerifier();
        console.log("Retrieved verifier:", verifier ? "Present" : "Missing");

        if (!verifier) {
          console.error("No code verifier found for PKCE exchange");
          throw new Error("Authentication failed - missing code verifier");
        }

        // Exchange code for session
        console.log("Exchanging auth code for session...");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("Session exchange error:", exchangeError);
          throw exchangeError;
        }

        if (!data?.user) {
          throw new Error("No user data received");
        }

        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', data.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Error fetching profile:", profileError);
          throw profileError;
        }

        // Create profile if it doesn't exist
        if (!profile) {
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name,
              avatar_url: data.user.user_metadata?.avatar_url,
              onboarding_completed: false
            });

          if (createError) {
            console.error("Error creating profile:", createError);
            throw createError;
          }

          // Redirect new users to onboarding
          navigate('/onboarding', { replace: true });
          return;
        }

        // Redirect based on onboarding status
        navigate(profile.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });

      } catch (error: any) {
        console.error("Auth callback error:", error);

        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: error.message || "Failed to complete authentication"
        });

        // Clear any stale auth state
        await supabase.auth.signOut();
        clearPKCEVerifier();

        navigate('/auth', { replace: true });
      } finally {
        if (mounted) {
          setIsProcessing(false);
        }
      }
    };

    handleAuthCallback();

    return () => {
      mounted = false;
    };
  }, [navigate, toast, isProcessing]);

  return null;
};

export default AuthCodeHandler;