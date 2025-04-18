
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
        
        // Get the full URL for direct processing
        const fullUrl = window.location.href;
        console.log("Processing URL:", fullUrl);
        
        // First attempt: Try using the built-in URL handling of Supabase
        try {
          console.log("Attempting direct URL processing with Supabase...");
          const { data: urlData, error: urlError } = await supabase.auth.getSessionFromUrl();
          
          if (urlData?.session) {
            console.log("Successfully obtained session from URL");
            processSuccessfulAuth(urlData.session);
            return;
          }
          
          if (urlError) {
            console.log("URL processing error:", urlError);
          }
        } catch (urlProcessingError) {
          console.error("Error in URL processing:", urlProcessingError);
        }
        
        // Second attempt: Try getting an existing session
        try {
          console.log("Checking for existing session...");
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session) {
            console.log("Found existing session");
            processSuccessfulAuth(sessionData.session);
            return;
          }
        } catch (sessionError) {
          console.error("Error getting session:", sessionError);
        }
        
        // Third attempt: Manual code exchange
        console.log("Attempting manual code exchange...");
        
        // Extract params from URL
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const sessionId = url.searchParams.get('session_id');
        
        if (!code) {
          console.error("No authentication code in URL");
          throw new Error("No authentication code provided");
        }
        
        console.log("Auth code found:", code.substring(0, 5) + "...");
        
        // Get code verifier from storage
        const allKeys = Object.keys(localStorage);
        
        // Find all possible verifier keys
        const verifierKeys = [
          'supabase.auth.code_verifier',
          `pkce_verifier_${sessionId}`,
          `verifier_${sessionId}`,
          'sb-pkce-verifier',
          'pkce-verifier'
        ];
        
        // Try to find any valid verifier
        let codeVerifier = null;
        for (const key of verifierKeys) {
          const value = localStorage.getItem(key);
          if (value && value.length >= 43 && value.length <= 128) {
            console.log(`Found verifier in ${key}:`, value.substring(0, 5) + "...");
            codeVerifier = value;
            
            // Ensure it's in the primary location
            localStorage.setItem('supabase.auth.code_verifier', value);
            break;
          }
        }
        
        // Last resort: generate a new verifier (less secure, but might work for some providers)
        if (!codeVerifier) {
          console.warn("No verifier found, generating a fallback (may not work)");
          // Generate a secure random string
          const array = new Uint8Array(64);
          crypto.getRandomValues(array);
          let base64 = btoa(String.fromCharCode.apply(null, Array.from(array)));
          
          // Make URL-safe per RFC 4648 §5
          codeVerifier = base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
            .substring(0, 64);
            
          localStorage.setItem('supabase.auth.code_verifier', codeVerifier);
        }
        
        if (!codeVerifier) {
          throw new Error("Authentication verification failed - missing verifier");
        }
        
        // Exchange code for session
        try {
          console.log("Exchanging code for session...");
          console.log(`- Code: ${code.substring(0, 5)}... (length: ${code.length})`);
          console.log(`- Verifier: ${codeVerifier.substring(0, 5)}... (length: ${codeVerifier.length})`);
          
          const { data, error } = await supabase.auth.exchangeCodeForSession(code, codeVerifier);
          
          if (error) {
            console.error("Code exchange error:", error);
            throw error;
          }
          
          if (data?.session) {
            // Check if profile exists
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .maybeSingle();
            
            if (profileError) {
              console.error("Error fetching profile:", profileError);
            }
            
            // Create profile if it doesn't exist
            if (!profile) {
              console.log("Creating new profile for user", data.session.user.id);
              try {
                await supabase.from('profiles').insert({
                  id: data.session.user.id,
                  email: data.session.user.email,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  last_seen: new Date().toISOString(),
                  onboarding_completed: false
                });
                
                // Redirect new user to onboarding
                navigate('/onboarding', { replace: true });
                return;
              } catch (insertError) {
                console.error("Error creating profile:", insertError);
              }
            } else {
              // Update last seen timestamp
              try {
                await supabase
                  .from('profiles')
                  .update({ last_seen: new Date().toISOString() })
                  .eq('id', data.session.user.id);
              } catch (updateError) {
                console.error("Error updating last seen:", updateError);
                // Continue anyway - non-critical error
              }
              
              // Redirect based on onboarding status
              if (profile?.onboarding_completed) {
                navigate('/dashboard', { replace: true });
              } else {
                navigate('/onboarding', { replace: true });
              }
            }
          } else {
            throw new Error("No session returned after code exchange");
          }
        } catch (exchangeError) {
          console.error("Error exchanging code for session:", exchangeError);
          
          // Try one more approach: refresh the page and let Supabase auto-handle
          if (!localStorage.getItem('auth_callback_attempted')) {
            localStorage.setItem('auth_callback_attempted', 'true');
            console.log("Refreshing page to attempt auto-handling...");
            window.location.reload();
            return;
          }
          
          throw new Error("Failed to exchange code for session");
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        
        // Clean storage for fresh login attempt
        Object.keys(localStorage).forEach(key => {
          if (key.includes('auth') || key.includes('verifier') || key.includes('code')) {
            localStorage.removeItem(key);
          }
        });
        
        toast({
          variant: "destructive", 
          title: "Authentication Failed",
          description: "Please try logging in again. " + (error.message || "")
        });
        
        navigate('/auth', { replace: true });
      }
    };

    // Clear any previous attempt marker
    localStorage.removeItem('auth_callback_attempted');
    
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
