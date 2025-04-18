
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getPKCEVerifier, exchangeAuthCode, debugPKCEState } from '@/utils/pkceHelper';

const AuthCodeHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processingAuth, setProcessingAuth] = useState(false);

  useEffect(() => {
    const handleAuthRedirect = async () => {
      // Prevent multiple processing attempts
      if (processingAuth) return;
      setProcessingAuth(true);

      try {
        // Log the debug state immediately on component mount
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        console.log("===== AUTH CODE HANDLER =====");
        console.log("Auth code present:", !!code);
        console.log("Auth error present:", !!error);
        
        // Run PKCE debug diagnostics
        debugPKCEState();
        
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

        // Check for code verifier
        const verifier = getPKCEVerifier();
        if (!verifier) {
          console.error("Critical: No code verifier found for auth exchange");
          
          // Try to recover from session storage or cookies directly
          const sessionVerifier = sessionStorage.getItem('supabase.auth.code_verifier');
          const cookieVerifier = document.cookie.split(';')
            .find(c => c.trim().startsWith('pkce_verifier='))
            ?.split('=')[1];
            
          if (sessionVerifier || cookieVerifier) {
            console.log("Attempting recovery with alternative verifier source");
            localStorage.setItem('supabase.auth.code_verifier', sessionVerifier || cookieVerifier || '');
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

        console.log("Found code verifier, proceeding with exchange");
        
        // Exchange auth code for session
        const { data, error: sessionError } = await exchangeAuthCode(code);

        if (sessionError) {
          console.error("Code exchange error:", sessionError);
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: sessionError.message
          });
          navigate('/auth', { replace: true });
          return;
        }

        if (data.session) {
          console.log("Authentication successful!");
          
          // Try to check user's profile
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', data.session.user.id)
              .single();
            
            // Redirect based on onboarding status
            if (profileData && profileData.onboarding_completed) {
              navigate('/dashboard', { replace: true });
            } else {
              navigate('/onboarding', { replace: true });  
            }
          } catch (profileError) {
            // If profile check fails, just go to dashboard
            console.error("Error checking profile:", profileError);
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
        navigate('/auth', { replace: true });
      } catch (err) {
        console.error("Unexpected error in auth handler:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred. Please try again."
        });
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
