import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getPKCEVerifier, storePKCEVerifier } from '@/utils/pkceHelper';

const AuthCodeHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle authentication in component mount
  useEffect(() => {
    const handleAuthRedirect = async () => {
      // Check if we have any authentication parameters
      const url = new URL(window.location.href);
      const hasAuthParams = url.searchParams.has('code') || url.searchParams.has('error');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      
      if (hasAuthParams) {
        console.log("===== AUTH CODE HANDLER =====");
        console.log("Detected authentication parameters");
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
          console.error("Auth code missing from URL");
          return;
        }
        
        // Get code verifier from all possible storage locations
        const codeVerifier = getPKCEVerifier();
        
        if (!codeVerifier) {
          console.error("PKCE code verifier not found in any storage location");
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "Session verification failed. Please try again."
          });
          navigate('/auth', { replace: true });
          return;
        }
        
        // Store code verifier in all storage mechanisms to ensure availability
        storePKCEVerifier(codeVerifier);
        
        // If we're not already in callback page, redirect there
        if (!window.location.pathname.includes('/auth/callback')) {
          console.log("Redirecting to callback handler");
          navigate(`/auth/callback${window.location.search}`, { replace: true });
        }
      }
    };
    
    handleAuthRedirect();
  }, [navigate, toast]);

  return null;
};

export default AuthCodeHandler;