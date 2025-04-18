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
          // Try multiple sources for the code verifier
          console.log("Checking for code verifier...");
          console.log("localStorage keys:", Object.keys(localStorage));

          // Get session ID if available
          const sessionId = url.searchParams.get('session_id');

          // Check multiple locations for code verifier
          let codeVerifier = null;

          // 1. Try standard Supabase location first
          codeVerifier = localStorage.getItem('supabase.auth.code_verifier');

          // 2. Try session-specific keys
          if (!codeVerifier && sessionId) {
            codeVerifier = localStorage.getItem(`pkce_verifier_${sessionId}`);
            if (codeVerifier) {
              console.log("Found verifier in session-specific key");
              // Copy to standard location
              localStorage.setItem('supabase.auth.code_verifier', codeVerifier);
            }
          }

          // 3. Try alternative keys
          if (!codeVerifier) {
            const alternativeKeys = ['sb-pkce-verifier', 'pkce-verifier'];
            for (const key of alternativeKeys) {
              const value = localStorage.getItem(key);
              if (value) {
                console.log(`Found verifier in ${key}`);
                codeVerifier = value;
                localStorage.setItem('supabase.auth.code_verifier', value);
                break;
              }
            }
          }

          // 4. Try sessionStorage
          if (!codeVerifier) {
            codeVerifier = sessionStorage.getItem('supabase.auth.code_verifier');
            if (codeVerifier) {
              console.log("Found verifier in sessionStorage");
              localStorage.setItem('supabase.auth.code_verifier', codeVerifier);
            }
          }

          // 5. Try window object
          if (!codeVerifier) {
            try {
              const windowVerifier = (window as any).__PKCE_VERIFIER__;
              if (windowVerifier) {
                console.log("Found verifier in window object");
                codeVerifier = windowVerifier;
                localStorage.setItem('supabase.auth.code_verifier', codeVerifier);
              }
            } catch (e) {
              console.error("Error accessing window object", e);
            }
          }

          // 6. Try cookie as last resort
          if (!codeVerifier) {
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
              const [name, value] = cookie.trim().split('=');
              if (name === 'pkce_verifier') {
                console.log("Found verifier in cookie");
                codeVerifier = decodeURIComponent(value);
                localStorage.setItem('supabase.auth.code_verifier', codeVerifier);
                break;
              }
            }
          }

          console.log("Code verifier exists:", !!codeVerifier);
          console.log("Code verifier length:", codeVerifier?.length || 0);

          if (!codeVerifier) {
            console.error("Missing code verifier in all storage locations");

            // Attempt direct URL processing as fallback
            try {
              console.log("Attempting to process the URL directly with Supabase...");
              const { data: urlData } = await supabase.auth.getSessionFromUrl();

              if (urlData?.session) {
                console.log("Successfully got session from URL directly");
                // Success! Continue with this session
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('onboarding_completed')
                  .eq('id', urlData.session.user.id)
                  .maybeSingle();

                // Redirect based on profile status
                if (profile?.onboarding_completed) {
                  window.location.href = '/dashboard';
                } else {
                  window.location.href = '/onboarding';
                }
                return;
              }
            } catch (urlError) {
              console.error("URL processing failed:", urlError);
            }

            toast({
              variant: "destructive",
              title: "Authentication Failed",
              description: "OAuth verification failed. Please try logging in again."
            });
            navigate('/auth', { replace: true });
            return;
          }

          // Ensure both code and verifier are valid
          if (typeof code !== 'string' || !code.trim() || typeof codeVerifier !== 'string' || !codeVerifier.trim()) {
            console.error("Code or code verifier is invalid");
            toast({
              variant: "destructive",
              title: "Authentication Failed",
              description: "Invalid authentication data. Please try logging in again."
            });
            navigate('/auth', { replace: true });
            return;
          }

          console.log("Exchanging auth code for session...");
          console.log("Code prefix:", code.substring(0, 5) + "...");
          console.log("Verifier prefix:", codeVerifier.substring(0, 5) + "...");

          // Use the Supabase function to exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code, codeVerifier);

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