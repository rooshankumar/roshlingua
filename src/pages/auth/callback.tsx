
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { exchangeAuthCode, getPKCEVerifier, debugPKCEState } from '@/utils/pkceHelper';

const Callback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("===== AUTH CALLBACK PROCESSING =====");
        
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
        
        // Verify PKCE verifier exists
        let verifier = getPKCEVerifier();
        
        // Last-ditch effort if no verifier is found
        if (!verifier) {
          console.error("No code verifier found in any storage location");
          console.log("Attempting emergency verifier recovery...");
          
          // Try to extract from cookies directly
          const pkceVerifierCookie = document.cookie.split(';')
            .find(c => c.trim().startsWith('pkce_verifier='));
            
          if (pkceVerifierCookie) {
            verifier = pkceVerifierCookie.split('=')[1];
            localStorage.setItem('supabase.auth.code_verifier', verifier);
            console.log("Recovered verifier from direct cookie access");
          } else {
            setErrorDetails("Missing security verifier");
            throw new Error("Authentication failed - missing verifier");
          }
        }
        
        console.log("Using verifier, length:", verifier.length);
        
        // Exchange code for session
        const { data, error: sessionError } = await exchangeAuthCode(code);
        
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

        // Check for existing profile
        try {
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
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/20"></div>
        <div className="h-2 w-24 rounded-full bg-primary/20"></div>
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
