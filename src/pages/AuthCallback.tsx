import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

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

        // Exchange the code for a session with retry
        let retries = 2;
        let sessionError = null;
        let data = null;

        while (retries > 0) {
          try {
            const result = await supabase.auth.exchangeCodeForSession(code);
            if (result.error) {
              console.error("Session exchange error:", result.error);
              sessionError = result.error;
              retries--;
              if (retries > 0) {
                await new Promise(r => setTimeout(r, 1000)); // Longer wait between retries
                continue;
              }
              break;
            }
            data = result.data;
            break;
          } catch (e) {
            console.error("Auth callback error:", e);
            sessionError = e;
            retries--;
            if (retries > 0) {
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        }

        if (sessionError) {
          console.error("Authentication error:", sessionError);
          throw sessionError;
        }

        console.log("Session check result:", data.session ? "Session exists" : "No session");

        if (data?.session) {
          // Session exists, check if profile exists and if onboarding was completed
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', data.session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error("Error fetching profile:", profileError);
          }

          // Create profile if it doesn't exist
          if (!profile) {
            console.log("Creating new profile for user:", data.session.user.id);
            const { error: insertError } = await supabase.from('profiles').insert({
              id: data.session.user.id,
              email: data.session.user.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_seen: new Date().toISOString(),
              onboarding_completed: false
            });

            if (insertError) {
              console.error("Error creating profile:", insertError);
            }
          }

          // Update last seen  -  Modified to use a stored procedure for better transaction management.
          try {
            console.log("User signed in, updating profile");
            const { error: profileError } = await supabase.rpc('handle_user_profile_upsert', {
              user_id: data.session.user.id,
              user_email: data.session.user.email,
              current_timestamp: new Date().toISOString()
            });

            if (profileError) {
              console.error("Error updating profile on sign in:", profileError);
              throw profileError;
            }
          } catch (error) {
            console.error("Error updating profile in transaction:", error);
            // Handle the transaction error appropriately, e.g., retry or display a user-friendly message.
            throw error; // Re-throw to be caught by the outer try-catch.
          }


          // Redirect based on onboarding status
          setTimeout(() => {
            if (profile?.onboarding_completed) {
              console.log("Onboarding completed, redirecting to dashboard");
              navigate('/dashboard', { replace: true });
            } else {
              console.log("Onboarding not completed, redirecting to onboarding");
              navigate('/onboarding', { replace: true });
            }
          }, 500);
        } else {
          toast({
            title: "Authentication failed",
            description: "Could not authenticate with the provider",
            variant: "destructive"
          });
          navigate('/auth', { replace: true });
        }
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