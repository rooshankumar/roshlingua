
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const Callback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("===== AUTH CALLBACK PROCESSING =====");
        console.log("Processing authentication callback on dedicated callback page...");
        
        // Log timing information
        const redirectTime = localStorage.getItem('auth_redirect_time');
        if (redirectTime) {
          const timeSinceRedirect = Date.now() - parseInt(redirectTime);
          console.log(`Time since redirect: ${timeSinceRedirect}ms`);
        }
        
        // Log the URL for debugging
        console.log("Current URL:", window.location.href);
        console.log("Hostname:", window.location.hostname);
        console.log("Vercel deployment:", window.location.hostname.includes('vercel.app') ? 'Yes' : 'No');
        
        // Extract session ID if available to track specific login attempt
        const url = new URL(window.location.href);
        const sessionId = url.searchParams.get('session_id');
        console.log("Session ID from URL:", sessionId);
        
        // Check if session already exists (from auto-handling)
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionData?.session) {
          console.log("Session already established by Supabase auto-handling");
          processSuccessfulAuth(sessionData.session);
          return;
        }
        
        if (sessionError) {
          console.error("Session retrieval error:", sessionError);
        }
        
        // Debug localStorage state
        console.log("===== LOCAL STORAGE STATE =====");
        const allKeys = Object.keys(localStorage);
        console.log("All localStorage keys:", allKeys);
        
        // Look for code verifier in multiple possible locations
        const verifierKeys = allKeys.filter(key => 
          key.includes('code_verifier') || 
          key.includes('verifier') || 
          (sessionId && key.includes(sessionId))
        );
        console.log("Potential verifier keys:", verifierKeys);
        
        // Try to get the code verifier
        let codeVerifier = null;
        
        // 1. First try session-specific verifier if we have a session ID
        if (sessionId) {
          // Check for our custom session verifier
          const sessionVerifier = localStorage.getItem(`pkce_verifier_${sessionId}`);
          if (sessionVerifier) {
            console.log(`Found session-specific verifier for ${sessionId}`);
            codeVerifier = sessionVerifier;
          }
          
          // Also check legacy format
          if (!codeVerifier) {
            const legacySessionVerifier = localStorage.getItem(`verifier_${sessionId}`);
            if (legacySessionVerifier) {
              console.log(`Found legacy session-specific verifier for ${sessionId}`);
              codeVerifier = legacySessionVerifier;
            }
          }
        }
        
        // 2. Try standard Supabase location - this is the primary source
        if (!codeVerifier) {
          const standardVerifier = localStorage.getItem('supabase.auth.code_verifier');
          if (standardVerifier) {
            console.log("Found verifier in standard Supabase location");
            codeVerifier = standardVerifier;
          } else {
            console.warn("WARNING: No verifier found in primary Supabase location!");
          }
        }
        
        // Look for verifier in sessionStorage as fallback
        if (!codeVerifier) {
          const sessionStorageVerifier = sessionStorage.getItem('supabase.auth.code_verifier');
          if (sessionStorageVerifier) {
            console.log("Found verifier in sessionStorage");
            codeVerifier = sessionStorageVerifier;
            // Restore to localStorage for Supabase to find it
            localStorage.setItem('supabase.auth.code_verifier', sessionStorageVerifier);
            console.log("Restored verifier to localStorage from sessionStorage");
          }
        }
        
        // 3. Try all other potential locations
        if (!codeVerifier) {
          console.log("Trying alternative locations for code verifier...");
          // Check additional known locations
          const alternativeKeys = [
            'sb-pkce-verifier',
            'pkce-verifier',
            'supabase-pkce-verifier'
          ];
          
          for (const key of [...verifierKeys, ...alternativeKeys]) {
            const value = localStorage.getItem(key);
            if (value) {
              console.log(`Found verifier in key: ${key}`);
              codeVerifier = value;
              // Important: also set to the primary location for Supabase to find
              localStorage.setItem('supabase.auth.code_verifier', value);
              console.log("Copied verifier to primary Supabase location");
              break;
            }
          }
        }
        
        // 4. Last resort - try searching all localStorage keys for anything that might be a verifier
        if (!codeVerifier) {
          console.log("Performing deep search for code verifier...");
          for (const key of Object.keys(localStorage)) {
            const value = localStorage.getItem(key);
            if (value && value.length >= 43 && value.length <= 128) {
              // PKCE verifiers must be 43-128 chars long
              console.log(`Found potential verifier in key: ${key} (length: ${value.length})`);
              codeVerifier = value;
              break;
            }
          }
        }
        
        // Final status of code verifier
        console.log("Code verifier retrieval success:", !!codeVerifier);
        if (codeVerifier) {
          console.log("Code verifier length:", codeVerifier.length);
          console.log("First 5 chars:", codeVerifier.substring(0, 5));
        }
        
        // Get URL parameters for authentication
        console.log("===== AUTH PARAMETERS =====");
        const code = url.searchParams.get('code');
        const error_param = url.searchParams.get('error');
        const error_description = url.searchParams.get('error_description');
        const state = url.searchParams.get('state');
        
        console.log("Auth code exists:", !!code);
        if (code) console.log("Auth code prefix:", code.substring(0, 5) + "...");
        console.log("State exists:", !!state);
        
        // Handle any OAuth errors
        if (error_param) {
          console.error("OAuth error:", error_param, error_description);
          throw new Error(`OAuth Error: ${error_param}: ${error_description}`);
        }
        
        // Handle missing auth code
        if (!code) {
          console.error("No authentication code in URL");
          // Try waiting briefly for Supabase auto-handling
          console.log("Waiting for potential auto-handling...");
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const { data: retryData } = await supabase.auth.getSession();
          if (retryData?.session) {
            console.log("Session established after delay");
            processSuccessfulAuth(retryData.session);
            return;
          }
          
          throw new Error("No authentication code provided");
        }
        
        // Handle missing code verifier
        if (!codeVerifier) {
          console.error("No code verifier found in storage");
          // Store error info for debugging
          localStorage.setItem('auth_error_time', Date.now().toString());
          localStorage.setItem('auth_error_type', 'missing_verifier');
          // Clean storage for fresh start
          Object.keys(localStorage).forEach(key => {
            if (key.includes('auth') || key.includes('verifier') || key.includes('code')) {
              localStorage.removeItem(key);
            }
          });
          throw new Error("Authentication verification failed - missing verifier. Please try again.");
        }
        
        // Validate code and verifier
        if (typeof code !== 'string' || !code.trim() || typeof codeVerifier !== 'string' || !codeVerifier.trim()) {
          console.error("Invalid code or verifier:", {
            codeType: typeof code,
            codeEmpty: !code?.trim(),
            verifierType: typeof codeVerifier,
            verifierEmpty: !codeVerifier?.trim()
          });
          
          throw new Error("Invalid authentication data");
        }
        
        // Exchange code for session
        console.log("===== EXCHANGING CODE FOR SESSION =====");
        console.log("Code prefix:", code.substring(0, 5) + "...");
        console.log("Verifier length:", codeVerifier.length);
        console.log("Verifier prefix:", codeVerifier.substring(0, 5) + "...");
        
        // Check if code and verifier meet PKCE requirements
        if (codeVerifier.length < 43 || codeVerifier.length > 128) {
          console.error("Code verifier length invalid:", codeVerifier.length);
          console.error("PKCE requires 43-128 characters");
          throw new Error("Authentication verification failed - invalid verifier length");
        }
        
        // Check characters in verifier (should only contain [A-Z], [a-z], [0-9], "-", ".", "_", "~")
        const validPKCEPattern = /^[A-Za-z0-9\-._~]+$/;
        if (!validPKCEPattern.test(codeVerifier)) {
          console.error("Code verifier contains invalid characters");
          console.error("PKCE requires URL-safe characters only");
          throw new Error("Authentication verification failed - invalid verifier format");
        }
        
        try {
          console.log("Calling exchangeCodeForSession with:");
          console.log(`- Code: ${code.substring(0, 5)}... (length: ${code.length})`);
          console.log(`- Verifier: ${codeVerifier.substring(0, 5)}... (length: ${codeVerifier.length})`);
          
          const { data, error } = await supabase.auth.exchangeCodeForSession(code, codeVerifier);
          
          if (error) {
            console.error("Code exchange error:", error);
            console.error("Error details:", JSON.stringify(error));
            
            // Store error info for debugging
            localStorage.setItem('auth_error_time', Date.now().toString());
            localStorage.setItem('auth_error_type', 'exchange_failure');
            localStorage.setItem('auth_error_message', error.message);
            
            // Store diagnostic information
            localStorage.setItem('auth_exchange_code_length', code.length.toString());
            localStorage.setItem('auth_exchange_verifier_length', codeVerifier.length.toString());
            localStorage.setItem('auth_exchange_verifier_prefix', codeVerifier.substring(0, 5));
            
            // Clean up for fresh start
            verifierKeys.forEach(key => localStorage.removeItem(key));
            throw error;
          }
        } catch (exchangeError) {
          console.error("Exception during code exchange:", exchangeError);
          console.error("This could indicate a network issue or malformed request");
          
          // Store additional diagnostic info
          localStorage.setItem('auth_error_time', Date.now().toString());
          localStorage.setItem('auth_error_type', 'exchange_exception');
          localStorage.setItem('auth_error_message', exchangeError.message || 'Unknown error');
          
          throw new Error("Failed to exchange code for session: " + (exchangeError.message || 'Unknown error'));
        }
        
        if (data?.session) {
          console.log("Authentication successful, retrieving profile...");
          
          // Session exists, check if profile exists
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
            await supabase.from('profiles').insert({
              id: data.session.user.id,
              email: data.session.user.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_seen: new Date().toISOString(),
              onboarding_completed: false
            });
            
            // Clear all code verifiers after successful use
            verifierKeys.forEach(key => localStorage.removeItem(key));
            
            // Redirect new user to onboarding
            navigate('/onboarding', { replace: true });
            return;
          }
          
          // Update last seen timestamp
          await supabase
            .from('profiles')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', data.session.user.id);
          
          // Success - process the session
          processSuccessfulAuth(data.session);
        } else {
          // No session - redirect to login
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "Failed to complete authentication."
          });
          // Clean up authentication state
          verifierKeys.forEach(key => localStorage.removeItem(key));
          navigate('/auth', { replace: true });
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: error.message || "Failed to complete authentication"
        });
        navigate('/auth', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  // Helper function to process successful authentication
  const processSuccessfulAuth = async (session: any) => {
    try {
      console.log("Authentication successful, retrieving profile...");
      
      if (!session?.user?.id) {
        console.error("Session exists but no user ID found");
        navigate('/auth', { replace: true });
        return;
      }
      
      // Clean up all verification keys
      Object.keys(localStorage).forEach(key => {
        if (key.includes('code_verifier') || key.includes('verifier')) {
          localStorage.removeItem(key);
        }
      });
      
      // Session exists, check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching profile:", profileError);
      }
      
      // Create profile if it doesn't exist
      if (!profile) {
        console.log("Creating new profile for user:", session.user.id);
        await supabase.from('profiles').insert({
          id: session.user.id,
          email: session.user.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          onboarding_completed: false
        });
        
        // Redirect new user to onboarding
        navigate('/onboarding', { replace: true });
        return;
      }
      
      // Update last seen timestamp
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', session.user.id);
      
      // Redirect based on onboarding status
      console.log("Redirecting based on onboarding status:", profile?.onboarding_completed);
      if (profile?.onboarding_completed) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (error) {
      console.error("Error processing successful auth:", error);
      navigate('/auth', { replace: true });
    }
  };

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

export default Callback;
