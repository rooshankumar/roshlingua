import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getPKCEVerifier, exchangeAuthCode } from '@/utils/pkceHelper';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("Processing authentication callback...");
        setIsLoading(true);

        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const urlError = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        // Handle error from auth provider
        if (urlError) {
          console.error("Auth provider error:", urlError, errorDescription);
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: errorDescription || urlError
          });
          navigate('/auth', { replace: true });
          return;
        }

        // If no code, redirect to auth
        if (!code) {
          console.log("No auth code present, redirecting to auth");
          navigate('/auth', { replace: true });
          return;
        }

        // Clear any stale auth state
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');

        // Ensure we have a PKCE verifier before proceeding
        const verifier = getPKCEVerifier();

        if (!verifier) {
          console.error("Authentication error: Missing PKCE verifier");
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Security verification failed. Please try logging in again."
          });
          navigate('/auth', { replace: true });
          return;
        }

        console.log("Found PKCE verifier, length:", verifier.length);

        // Exchange the code for a session using our helper with the verifier
        let retries = 2;
        let sessionError = null;
        let data = null;

        // while (retries > 0) {
        //   try {
        //     // Use the exchangeAuthCode helper which handles the verifier
        //     const result = await exchangeAuthCode(code);
        //     data = result.data;
        //     sessionError = result.error;
        //     if (!sessionError) break;
        //     console.error("Auth exchange attempt failed:", sessionError);
        //     retries--;
        //     await new Promise(r => setTimeout(r, 500)); // Wait before retry
        //   } catch (e) {
        //     sessionError = e;
        //     console.error("Auth exchange exception:", e);
        //     retries--;
        //     await new Promise(r => setTimeout(r, 500));
        //   }
        // }

        // if (sessionError) {
        //   console.error("Authentication error:", sessionError);
        //   throw sessionError;
        // }
        // Replace the old code with the new code provided in the changes
        const handleAuthCallback = async () => {
          try {
            console.log("handleAuthCallback", code);
            //   if (isProcessing) return;
            //   setIsProcessing(true);


            if (!code) {
              console.error('No auth code found in URL');
              navigate('/auth', { replace: true });
              return;
            }

            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;

            navigate('/dashboard', { replace: true });
          } catch (error) {
            console.error('Authentication callback error:', error);
            toast({
              variant: "destructive",
              title: "Authentication failed",
              description: "Please try signing in again"
            });
            navigate('/auth', { replace: true });
          } finally {
            setIsLoading(false);
          }
        }

        await handleAuthCallback();


        // console.log("Session check result:", data.session ? "Session exists" : "No session");

        // if (data?.session) {
        //   // Session exists, check if profile exists and if onboarding was completed
        //   const { data: profile, error: profileError } = await supabase
        //     .from('profiles')
        //     .select('onboarding_completed')
        //     .eq('id', data.session.user.id)
        //     .single();

        //   if (profileError && profileError.code !== 'PGRST116') {
        //     console.error("Error fetching profile:", profileError);
        //   }

        //   // Create profile if it doesn't exist
        //   if (!profile) {
        //     console.log("Creating new profile for user:", data.session.user.id);
        //     const { error: insertError } = await supabase.from('profiles').insert({
        //       id: data.session.user.id,
        //       email: data.session.user.email,
        //       created_at: new Date().toISOString(),
        //       updated_at: new Date().toISOString(),
        //       last_seen: new Date().toISOString(),
        //       onboarding_completed: false
        //     });

        //     if (insertError) {
        //       console.error("Error creating profile:", insertError);
        //     }
        //   }

        //   // Update last seen  -  Modified to ensure ID is properly set
        //   try {
        //     if (!data?.session?.user?.id) {
        //       throw new Error("No user ID available in session");
        //     }

        //     console.log("User signed in, updating profile with ID:", data.session.user.id);

        //     // First ensure profile exists
        //     const { error: insertError } = await supabase
        //       .from('profiles')
        //       .upsert({
        //         id: data.session.user.id,
        //         email: data.session.user.email,
        //         created_at: new Date().toISOString(),
        //         updated_at: new Date().toISOString(),
        //         last_seen: new Date().toISOString()
        //       }, {
        //         onConflict: 'id'
        //       });

        //     if (insertError) {
        //       console.error("Error ensuring profile exists:", insertError);
        //       throw insertError;
        //     }

        //     // Now update via RPC
        //     const { error: profileError } = await supabase.rpc('handle_user_profile_upsert', {
        //       user_id: data.session.user.id,
        //       user_email: data.session.user.email,
        //       current_timestamp: new Date().toISOString()
        //     });

        //     if (profileError) {
        //       console.error("Error updating profile on sign in:", profileError);
        //       throw profileError;
        //     }
        //   } catch (error) {
        //     console.error("Error updating profile in transaction:", error);
        //     throw error;
        //   }


        //   // Redirect based on onboarding status
        //   setTimeout(() => {
        //     if (profile?.onboarding_completed) {
        //       console.log("Onboarding completed, redirecting to dashboard");
        //       navigate('/dashboard', { replace: true });
        //     } else {
        //       console.log("Onboarding not completed, redirecting to onboarding");
        //       navigate('/onboarding', { replace: true });
        //     }
        //   }, 500);
        // } else {
        //   toast({
        //     title: "Authentication failed",
        //     description: "Could not authenticate with the provider",
        //     variant: "destructive"
        //   });
        //   navigate('/auth', { replace: true });
        // }
      } catch (error) {
        console.error("Authentication callback error:", error);
        toast({
          title: "Authentication failed",
          description: "An error occurred during authentication",
          variant: "destructive"
        });
        navigate('/auth', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/20"></div>
        <div className="h-2 w-24 rounded-full bg-primary/20"></div>
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;