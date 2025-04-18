import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getPKCEVerifier, exchangeAuthCode, debugPKCEState, clearPKCEVerifier, storePKCEVerifier } from '@/utils/pkceHelper';

const AuthCodeHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processingAuth, setProcessingAuth] = useState(false);

  // Check and restore verifier on component mount
  useEffect(() => {
    // Try to recover verifier from cookie on every page load
    recoverVerifierFromCookie();
  }, []);

  const recoverVerifierFromCookie = () => {
    // Check for cookie verifier immediately
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if ((name.includes('verifier') || name.includes('code') || name.includes('pkce')) && value && value.length > 20) {
        console.log("Found verifier in cookie, restoring to storage:", name);
        localStorage.setItem('supabase.auth.code_verifier', value);
        sessionStorage.setItem('supabase.auth.code_verifier', value);
        return true;
      }
    }
    return false;
  };

  const checkForEmergencyRecovery = () => {
    // This function tries to recover verifier from any possible source
    console.log("Performing emergency verifier recovery checks...");

    // First try cookie recovery
    if (recoverVerifierFromCookie()) {
      return localStorage.getItem('supabase.auth.code_verifier');
    }

    // Search local and session storage for anything that could be a verifier
    const storageKeys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)];
    for (const key of storageKeys) {
      if (key.includes('verifier') || key.includes('code') || key.includes('pkce')) {
        const value = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (value && value.length > 20) {
          console.log("Found potential verifier in storage:", key);
          localStorage.setItem('supabase.auth.code_verifier', value);
          sessionStorage.setItem('supabase.auth.code_verifier', value);
          return value;
        }
      }
    }

    return null;
  };

    const handleAuthRedirect = async () => {
      // Prevent multiple processing attempts
      if (processingAuth) return;
      setProcessingAuth(true);

      try {
        // Get URL parameters
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        console.log("===== AUTH CODE HANDLER =====");
        console.log("Auth code present:", !!code);
        console.log("Auth error present:", !!error);
        console.log("URL:", window.location.href);

        // Run PKCE debug diagnostics
        const diagnostics = debugPKCEState();
        console.log("PKCE diagnostics:", diagnostics);

        if (error) {
          console.error(`Auth error: ${error} - ${errorDescription}`);
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: errorDescription || error
          });
          navigate('/auth', { replace: true });
          return;
        }

        if (!code) {
          // Not a callback with auth code, nothing to do
          setProcessingAuth(false);
          return;
        }

        console.log("Found auth code in URL:", code.substring(0, 5) + "...", "length:", code.length);

        // Get code verifier using our robust recovery function
        let verifier = getPKCEVerifier();

        // If no verifier found, try emergency recovery
        if (!verifier) {
          console.error("Critical: No code verifier found for auth exchange");

          // Try our emergency recovery function
          verifier = checkForEmergencyRecovery();

          // If still no verifier, try to check directly in cookies and sessionStorage
          if (!verifier) {
            console.log("Trying direct recovery from cookies and other sources...");

            // Try direct cookie access
            const cookieVerifier = document.cookie.split(';')
              .find(c => c.trim().startsWith('pkce_verifier=') || c.trim().startsWith('supabase_code_verifier=') || c.trim().startsWith('code_verifier='))
              ?.split('=')[1];

            // Try session storage
            const sessionVerifier = sessionStorage.getItem('supabase.auth.code_verifier');

            // Try other backup locations (check ALL possible storage keys)
            const backupKeys = [
              'pkce_verifier_backup',
              'sb-pkce-verifier',
              'pkce_verifier_original',
              'code_verifier',
              'sb-code-verifier',
              'pkce_verifier',
              'auth.code_verifier',
              'oauth_verifier'
            ];

            let backupVerifier = null;
            for (const key of backupKeys) {
              const value = localStorage.getItem(key) || sessionStorage.getItem(key);
              if (value && value.length >= 20) {
                backupVerifier = value;
                console.log(`Found verifier in backup location: ${key}`);
                break;
              }
            }

            // Try hidden input field
            let hiddenVerifier = null;
            try {
              const backupInput = document.getElementById('pkce-backup') as HTMLInputElement;
              if (backupInput && backupInput.value && backupInput.value.length >= 20) {
                hiddenVerifier = backupInput.value;
                console.log("Found verifier in hidden input field");
              }
            } catch (e) {
              console.warn("Error checking hidden input field:", e);
            }

            // Check window global
            let windowVerifier = null;
            try {
              if ((window as any).__PKCE_VERIFIER__ && (window as any).__PKCE_VERIFIER__.length >= 20) {
                windowVerifier = (window as any).__PKCE_VERIFIER__;
                console.log("Found verifier in window global");
              } else if ((window as any).pkce_verifier && (window as any).pkce_verifier.length >= 20) {
                windowVerifier = (window as any).pkce_verifier;
                console.log("Found verifier in window.pkce_verifier");
              }
            } catch (e) {
              console.warn("Error checking window globals:", e);
            }

            // Try extracting from URL state parameter
            let stateVerifier = null;
            try {
              const url = new URL(window.location.href);
              const state = url.searchParams.get('state');
              if (state) {
                const stateObj = JSON.parse(atob(state));
                if (stateObj && stateObj.verifier && stateObj.verifier.length >= 20) {
                  stateVerifier = stateObj.verifier;
                  console.log("Found verifier in state parameter");
                }
              }
            } catch (e) {
              console.warn("Error extracting from state parameter:", e);
            }

            // Use the first valid verifier we find
            const recoveredVerifier = cookieVerifier || sessionVerifier || backupVerifier || 
                                     hiddenVerifier || windowVerifier || stateVerifier;

            if (recoveredVerifier) {
              console.log("Recovered verifier from direct source check");
              localStorage.setItem('supabase.auth.code_verifier', recoveredVerifier);
              storePKCEVerifier(recoveredVerifier); // Store in all locations
              verifier = recoveredVerifier;
            } else {
              toast({
                variant: "destructive",
                title: "Authentication Failed",
                description: "Missing security code verifier. Please try again."
              });
              navigate('/auth', { replace: true });
              return;
            }
          }
        }

        // Verify we have a valid verifier
        if (!verifier || verifier.length < 20) {
          console.error("Invalid verifier:", verifier);
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "Invalid security code verifier. Please try again."
          });
          navigate('/auth', { replace: true });
          return;
        }

        console.log("Using verifier:", verifier.substring(0, 5) + "...", "length:", verifier.length);

        // Exchange auth code for session
        const { data, error: sessionError } = await exchangeAuthCode(code);

        if (sessionError) {
          console.error("Code exchange error:", sessionError);
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: sessionError.message
          });
          clearPKCEVerifier(); // Clear verifier after failed attempt
          navigate('/auth', { replace: true });
          return;
        }

        if (data.session) {
          console.log("Authentication successful!");
          clearPKCEVerifier(); // Clear verifier after successful authentication

          // Try to check user's profile
          try {
            // Fix headers to avoid 406 errors
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', data.session.user.id)
              .single()
              .headers({
                'Accept': '*/*',
                'Content-Type': 'application/json'
              });

            if (profileError) {
              console.error("Profile fetch error:", profileError);
              throw profileError;
            }

            // Redirect based on onboarding status
            if (profileData && profileData.onboarding_completed) {
              console.log("User has completed onboarding, redirecting to dashboard");
              navigate('/dashboard', { replace: true });
            } else {
              console.log("User needs to complete onboarding");
              navigate('/onboarding', { replace: true });  
            }
          } catch (profileError) {
            // If profile check fails, just go to dashboard
            console.error("Error checking profile:", profileError);

            // Try a direct check with modified headers as a fallback
            try {
              const { data, error } = await supabase.rpc('get_profile_status', {
                user_id: data.session.user.id
              }).headers({
                'Accept': '*/*',
                'Content-Type': 'application/json'
              });

              if (!error && data && data.onboarding_completed) {
                navigate('/dashboard', { replace: true });
                return;
              }
            } catch (e) {
              console.error("Fallback profile check failed:", e);
            }

            // Default to dashboard if everything fails
            navigate('/dashboard', { replace: true });
          }
          return;
        }

        // No session and no error is unexpected
        console.error("No session returned after code exchange");
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: "Could not establish a session. Please try again."
        });
        clearPKCEVerifier(); // Clear on failure
        navigate('/auth', { replace: true });
      } catch (err) {
        console.error("Unexpected error in auth handler:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred. Please try again."
        });
        clearPKCEVerifier(); // Clear on error
        navigate('/auth', { replace: true });
      } finally {
        setProcessingAuth(false);
      }
    };

    handleAuthRedirect();
  }, [navigate, toast, processingAuth]);

  return null;
};

export default AuthCodeHandler;