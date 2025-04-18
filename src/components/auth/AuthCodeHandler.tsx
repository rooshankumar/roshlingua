
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getPKCEVerifier, exchangeAuthCode } from '@/utils/pkceHelper';

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
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        console.log("===== AUTH CODE HANDLER =====");
        console.log("Auth code present:", !!code);
        console.log("Auth error present:", !!error);

        if (error) {
          console.error(`Auth error: ${error} - ${url.searchParams.get('error_description')}`);
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: url.searchParams.get('error_description') || error
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
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "Missing security code verifier. Please try again."
          });
          navigate('/auth', { replace: true });
          return;
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
          navigate('/dashboard', { replace: true });
          return;
        }

        // No session and no error is unexpected
        console.error("No session returned after code exchange");
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: "Could not establish a session"
        });
        navigate('/auth', { replace: true });
      } catch (err) {
        console.error("Unexpected error in auth handler:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred"
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
