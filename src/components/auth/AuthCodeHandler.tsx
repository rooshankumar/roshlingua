
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { exchangeAuthCode, getPKCEVerifier } from '@/utils/pkceHelper';

const AuthCodeHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthRedirect = async () => {
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
        return;
      }
      
      // Verify we have a code verifier
      const verifier = getPKCEVerifier();
      if (!verifier) {
        console.error("No PKCE code verifier found");
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: "Session verification code was missing"
        });
        navigate('/auth', { replace: true });
        return;
      }
      
      try {
        // Try to exchange the code for a session
        const { data, error } = await exchangeAuthCode(code);
        
        if (error) {
          console.error("Authentication failed:", error);
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: error.message
          });
          navigate('/auth', { replace: true });
          return;
        }
        
        if (data.session) {
          console.log("Authentication successful");
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
        console.error("Error during authentication:", err);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "An unexpected error occurred"
        });
        navigate('/auth', { replace: true });
      }
    };
    
    handleAuthRedirect();
  }, [navigate, toast]);

  return null;
};

export default AuthCodeHandler;
