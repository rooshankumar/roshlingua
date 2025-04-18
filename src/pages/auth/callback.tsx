
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
        console.log("Processing authentication callback on dedicated callback page...");
        
        // Log the URL for debugging
        console.log("Current URL:", window.location.href);
        console.log("Vercel deployment:", window.location.hostname.includes('vercel.app') ? 'Yes' : 'No');
        
        // Try to use Supabase's built-in session handling first
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionData?.session) {
          console.log("Session already established by Supabase auto-handling");
          processSuccessfulAuth(sessionData.session);
          return;
        }
        
        if (sessionError) {
          console.error("Session retrieval error:", sessionError);
        }
        
        // Important: Get all possible verifier keys for debugging
        const allKeys = Object.keys(localStorage);
        console.log("All localStorage keys:", allKeys);
        const verifierKeys = allKeys.filter(key => key.includes('code_verifier') || key.includes('verifier'));
        console.log("All code verifier keys:", verifierKeys);
        
        // Check for code verifier in localStorage with expanded search
        let codeVerifier = localStorage.getItem('supabase.auth.code_verifier');
        console.log("Primary code verifier exists:", !!codeVerifier);
        
        // Try all possible storage locations
        if (!codeVerifier) {
          console.log("Trying alternative storage keys for code verifier...");
          // Try other possible keys if the standard one fails
          const possibleKeys = [
            'pkce-verifier',
            'supabase-code-verifier',
            'code_verifier',
            'sb-pkce-verifier',
            ...verifierKeys
          ];
          
          for (const key of possibleKeys) {
            const value = localStorage.getItem(key);
            if (value) {
              console.log(`Found verifier in key: ${key}`);
              codeVerifier = value;
              break;
            }
          }
        }
        
        console.log("Final code verifier exists:", !!codeVerifier);
        console.log("Code verifier length:", codeVerifier?.length || 0);
        
        // Get URL parameters for debugging
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error_param = url.searchParams.get('error');
        const error_description = url.searchParams.get('error_description');
        const state = url.searchParams.get('state');
        
        console.log("URL params:", { 
          code: code ? `${code.substring(0, 5)}...` : null,
          error: error_param,
          state: state ? `${state.substring(0, 5)}...` : null
        });
        
        if (error_param) {
          console.error("OAuth error:", error_param, error_description);
          throw new Error(`${error_param}: ${error_description}`);
        }
        
        if (!code) {
          console.error("No code parameter in URL");
          // Try to let Supabase handle this automatically
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: retryData } = await supabase.auth.getSession();
          if (retryData?.session) {
            console.log("Session established after delay");
            processSuccessfulAuth(retryData.session);
            return;
          }
          throw new Error("No authentication code provided in URL");
        }
        
        if (!codeVerifier) {
          console.error("No code verifier in localStorage");
          // Force a clean restart of the auth flow
          Object.keys(localStorage).forEach(key => {
            if (key.includes('supabase.auth') || key.includes('verifier') || key.includes('code')) {
              localStorage.removeItem(key);
            }
          });
          throw new Error("Authentication verification failed. Please try logging in again.");
        }
        
        // Ensure both code and verifier are strings and not empty
        if (typeof code !== 'string' || !code.trim() || typeof codeVerifier !== 'string' || !codeVerifier.trim()) {
          console.error("Code or code verifier is invalid:", {
            codeType: typeof code,
            codeEmpty: !code?.trim(),
            verifierType: typeof codeVerifier,
            verifierEmpty: !codeVerifier?.trim()
          });
          
          throw new Error("Invalid authentication data. Please try logging in again.");
        }
        
        console.log("Exchanging code for session with code:", code.substring(0, 5) + "...");
        console.log("Using code verifier of length:", codeVerifier.length);
        
        // Use the explicit method with directly passed parameters
        const { data, error } = await supabase.auth.exchangeCodeForSession(code, codeVerifier);
        
        if (error) {
          console.error("Exchange error:", error);
          // Clean up all auth-related storage to ensure fresh start on next attempt
          verifierKeys.forEach(key => localStorage.removeItem(key));
          throw error;
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
