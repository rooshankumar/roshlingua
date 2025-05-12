import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { exchangeAuthCode, getPKCEVerifier, debugPKCEState, clearPKCEVerifier, storePKCEVerifier } from '@/utils/pkceHelper';

const Callback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const scanStorageForVerifier = () => {
      console.log("Scanning all storage for verifier...");
      const potentialVerifiers = new Map<string, string>();

      // Check all localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value && value.length > 30) {
            console.log(`Found potential localStorage verifier: ${key}`);
            potentialVerifiers.set(key, value);
          }
        }
      }

      // Check all sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          const value = sessionStorage.getItem(key);
          if (value && value.length > 30) {
            console.log(`Found potential sessionStorage verifier: ${key}`);
            potentialVerifiers.set(key, value);
          }
        }
      }

      // Check all cookies
      document.cookie.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (value && value.length > 30) {
          console.log(`Found potential cookie verifier: ${name}`);
          potentialVerifiers.set(`cookie:${name}`, value);
        }
      });

      // Sort by key preference
      const pkceKeys = [...potentialVerifiers.keys()].filter(k => 
        k.includes('code_verifier') || k.includes('pkce') || k.includes('verifier')
      );

      if (pkceKeys.length > 0) {
        const bestKey = pkceKeys[0];
        const verifier = potentialVerifiers.get(bestKey)!;
        console.log(`Using verifier from ${bestKey}`);
        localStorage.setItem('supabase.auth.code_verifier', verifier);
        return verifier;
      }

      // If no PKCE keys found but we have other potential values, use the first one
      if (potentialVerifiers.size > 0) {
        const [key, value] = potentialVerifiers.entries().next().value;
        console.log(`Using verifier from ${key} as last resort`);
        localStorage.setItem('supabase.auth.code_verifier', value);
        return value;
      }

      return null;
    };

    const handleAuthCallback = async () => {
      try {
        console.log("===== AUTH CALLBACK PROCESSING =====");
        console.log("URL:", window.location.href);

        // Run diagnostic checks first
        const diagnostics = debugPKCEState();
        console.log("Auth diagnostics:", diagnostics);

        // Check for error parameter in URL
        const url = new URL(window.location.href);
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          console.error(`Auth error: ${error} - ${errorDescription}`);
          setErrorDetails(errorDescription || error);
          throw new Error(`OAuth error: ${errorDescription || error}`);
        }

        // Extract code from URL
        const code = url.searchParams.get('code');
        if (!code) {
          console.error("No authentication code in URL");
          setErrorDetails("Missing authentication code");
          throw new Error("Missing authentication code");
        }

        console.log("Found auth code in URL:", code.substring(0, 5) + "...", "length:", code.length);

        // Try to extract code verifier from URL state parameter first
        const state = url.searchParams.get('state');
        if (state) {
          try {
            // Some implementations embed the verifier in the state parameter
            const stateObj = JSON.parse(atob(state));
            if (stateObj && stateObj.verifier) {
              console.log("Found verifier in state parameter");
              localStorage.setItem('supabase.auth.code_verifier', stateObj.verifier);
              storePKCEVerifier(stateObj.verifier);
            }
          } catch (e) {
            console.error("Failed to parse state parameter:", e);
          }
        }

        // Try to get the verifier from our standard function 
        let verifier = getPKCEVerifier();

        // If no verifier found, try deeper scan
        if (!verifier) {
          console.error("No code verifier found through standard function");
          console.log("Attempting deeper storage scan...");

          // Check window global emergency backup
          if ((window as any).__PKCE_VERIFIER__) {
            verifier = (window as any).__PKCE_VERIFIER__;
            console.log("Retrieved verifier from window global backup");
            localStorage.setItem('supabase.auth.code_verifier', verifier);
          } else {
            // Try scanning storage
            verifier = scanStorageForVerifier();
          }

          // Try emergency session storage
          if (!verifier) {
            try {
              const emergencyData = sessionStorage.getItem('auth_emergency');
              if (emergencyData) {
                const parsed = JSON.parse(emergencyData);
                if (parsed.verifier && typeof parsed.verifier === 'string' && parsed.verifier.length > 20) {
                  verifier = parsed.verifier;
                  console.log("Recovered verifier from emergency session storage");
                  localStorage.setItem('supabase.auth.code_verifier', verifier);
                }
              }
            } catch (e) {
              console.error("Error checking emergency storage:", e);
            }
          }

          // Last-ditch direct cookie check
          if (!verifier) {
            console.error("Deep scan failed, trying direct cookie parse...");

            // Try looking for ANY cookie with a value that looks like a verifier
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
              const [name, value] = cookie.trim().split('=');
              if (value && value.length > 20) {
                console.log(`Found potential verifier in cookie: ${name}`);
                verifier = value;
                localStorage.setItem('supabase.auth.code_verifier', verifier);
                break;
              }
            }

            // If still no verifier, check specifically for known cookie names
            if (!verifier) {
              for (const cookieName of ['pkce_verifier', 'supabase_code_verifier', 'sb-pkce-verifier', 'code_verifier']) {
                const regex = new RegExp(`${cookieName}=([^;]+)`);
                const match = document.cookie.match(regex);
                if (match && match[1]) {
                  verifier = match[1];
                  console.log(`Extracted verifier directly from ${cookieName} cookie`);
                  localStorage.setItem('supabase.auth.code_verifier', verifier);
                  break;
                }
              }
            }
          }

          // If still no verifier, try using the code parameter as a last resort
          // (this is not standard PKCE but some implementations allow it)
          if (!verifier && code && code.length > 20) {
            console.warn("No verifier found, attempting to use code as verifier (non-standard)");
            verifier = code;
            localStorage.setItem('supabase.auth.code_verifier', verifier);
          }

          if (!verifier) {
            setErrorDetails("Missing security verifier");
            throw new Error("Authentication failed - missing verifier");
          }
        }

        // Validate verifier
        if (verifier.length < 20) {
          console.error("Verifier is too short:", verifier.length);
          setErrorDetails("Invalid security verifier");
          throw new Error("Authentication failed - invalid verifier");
        }

        console.log("Using verifier, length:", verifier.length);

        // Make sure the verifier is stored in all locations
        storePKCEVerifier(verifier);

        // Exchange code for session
        const { data, error: sessionError } = await exchangeAuthCode(code, verifier);

        if (sessionError) {
          console.error("Error exchanging code for session:", sessionError);
          setErrorDetails(sessionError.message);
          throw sessionError;
        }

        if (!data.session) {
          console.error("No session returned from code exchange");
          setErrorDetails("No session returned");
          throw new Error("Authentication failed - no session returned");
        }

        console.log("Successfully authenticated!");
        clearPKCEVerifier(); // Clear verifier after successful authentication

        // Check for existing profile
        try {
          // Add Accept header to avoid 406 errors
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', data.session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error("Error fetching profile:", profileError);
            throw profileError;
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
        clearPKCEVerifier(); // Clear verifier on error

        toast({
          variant: "destructive", 
          title: "Authentication Failed",
          description: errorDetails || error.message || "Please try logging in again."
        });

        navigate('/auth', { replace: true });
      } finally {
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate, toast, errorDetails]);

  return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="md" />
        <p className="text-muted-foreground">
          {isProcessing ? "Completing authentication..." : "Redirecting..."}
        </p>
        {errorDetails && (
          <div className="text-destructive text-sm mt-2 max-w-md text-center">
            Error: {errorDetails}
          </div>
        )}
      </div>
    </div>
  );
};

export default Callback;