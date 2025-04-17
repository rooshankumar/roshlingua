
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const AuthCodeHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle the code parameter in the URL (for Google OAuth)
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    
    if (code) {
      console.log("Detected code parameter, handling OAuth callback...");
      console.log("Code:", code.substring(0, 5) + "...");
      console.log("State exists:", !!state);

      const handleAuthWithCode = async () => {
        try {
          // Check if code verifier exists
          const codeVerifier = localStorage.getItem('supabase.auth.code_verifier');
          console.log("Code verifier exists:", !!codeVerifier);
          console.log("Code verifier length:", codeVerifier?.length || 0);
          
          if (!codeVerifier) {
            console.error("Missing code verifier in localStorage");
            // Generating a new code verifier here won't work for the current authentication request
            // as it needs to match what was used to start the flow
            toast({
              variant: "destructive",
              title: "Authentication Failed",
              description: "OAuth verification failed. Please try logging in again."
            });
            navigate('/auth', { replace: true });
            return;
          }
          
          console.log("Exchanging auth code for session...");
          // The full URL is needed as it contains both the code and state parameters
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);

          if (error) {
            console.error("Error exchanging code for session:", error);
            toast({
              variant: "destructive",
              title: "Authentication Failed",
              description: error.message || "Failed to complete authentication"
            });
            navigate('/auth', { replace: true });
            return;
          }

          if (data.session) {
            console.log("Successfully authenticated with OAuth");

            // Check if the user is new or existing
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
              console.log("Creating new profile for user");
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

              // Redirect new user to onboarding
              console.log("Redirecting to onboarding");
              window.location.href = '/onboarding';
              return;
            }

            // Update last seen timestamp
            await supabase
              .from('profiles')
              .update({ last_seen: new Date().toISOString() })
              .eq('id', data.session.user.id);

            // Redirect based on onboarding status
            if (profile.onboarding_completed) {
              console.log("Redirecting to dashboard");
              window.location.href = '/dashboard';
            } else {
              console.log("Redirecting to onboarding");
              window.location.href = '/onboarding';
            }
          } else {
            console.error("No session after code exchange");
            toast({
              variant: "destructive", 
              title: "Authentication Failed",
              description: "Failed to complete authentication"
            });
            navigate('/auth', { replace: true });
          }
        } catch (error) {
          console.error("Error in OAuth flow:", error);
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "An unexpected error occurred during authentication"
          });
          navigate('/auth', { replace: true });
        }
      };

      handleAuthWithCode();
    }
  }, [navigate, toast]);

  return null;
};

export default AuthCodeHandler;
