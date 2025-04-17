
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
        
        // Important: Get all possible verifier keys for debugging
        const allKeys = Object.keys(localStorage);
        const verifierKeys = allKeys.filter(key => key.includes('code_verifier'));
        console.log("All localStorage keys:", allKeys);
        console.log("All code verifier keys:", verifierKeys);
        
        // Check for code verifier in localStorage - try multiple possible keys
        let codeVerifier = localStorage.getItem('supabase.auth.code_verifier');
        
        if (!codeVerifier) {
          console.log("Trying alternative storage keys for code verifier...");
          // Try other possible keys if the standard one fails
          if (localStorage.getItem('pkce-verifier')) {
            codeVerifier = localStorage.getItem('pkce-verifier');
          } else if (localStorage.getItem('supabase-code-verifier')) {
            codeVerifier = localStorage.getItem('supabase-code-verifier');
          } else if (verifierKeys.length > 0) {
            // If any verifier-like key exists, try it
            codeVerifier = localStorage.getItem(verifierKeys[0]);
          }
        }
        
        console.log("Code verifier exists:", !!codeVerifier);
        console.log("Code verifier length:", codeVerifier?.length || 0);
        
        // Get URL parameters for debugging
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error_param = url.searchParams.get('error');
        const error_description = url.searchParams.get('error_description');
        
        if (error_param) {
          console.error("OAuth error:", error_param, error_description);
          throw new Error(`${error_param}: ${error_description}`);
        }
        
        if (!code) {
          console.error("No code parameter in URL");
          throw new Error("No authentication code provided");
        }
        
        if (!codeVerifier) {
          console.error("No code verifier in localStorage");
          // Force a clean restart of the auth flow
          localStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('supabase.auth.expires_at');
          localStorage.removeItem('supabase.auth.refresh_token');
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
          
          // Clear all code verifiers after successful use
          verifierKeys.forEach(key => localStorage.removeItem(key));
          
          // Redirect based on onboarding status
          if (profile?.onboarding_completed) {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/onboarding', { replace: true });
          }
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
