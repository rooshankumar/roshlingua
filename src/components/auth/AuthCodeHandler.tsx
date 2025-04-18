
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getPKCEVerifier, storePKCEVerifier, generateVerifier, exchangeAuthCode } from '@/utils/pkceHelper';

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
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "Authorization code is missing from the URL"
          });
          navigate('/auth', { replace: true });
          return;
        }
        
        // Get code verifier from all possible storage locations
        let codeVerifier = getPKCEVerifier();
        
        if (!codeVerifier) {
          console.error("PKCE code verifier not found in any storage location");
          
          // Last resort - create a new verifier (might not work but worth trying)
          codeVerifier = generateVerifier();
          console.log("Generated emergency verifier:", codeVerifier.substring(0, 5) + "...");
          
          toast({
            variant: "destructive",
            title: "Authentication Issue",
            description: "Session verification code was missing. Attempting recovery."
          });
        }
        
        // Store code verifier in all storage mechanisms to ensure availability
        storePKCEVerifier(codeVerifier);
        
        // If we have a code, attempt to handle it here
        if (code) {
          try {
            console.log("Attempting code exchange from AuthCodeHandler");
            const { data, error } = await exchangeAuthCode(code);
            
            if (error) {
              throw error;
            }
            
            if (data.session) {
              console.log("Authentication successful in AuthCodeHandler");
              // Navigate to proper page
              navigate('/dashboard', { replace: true });
              return;
            }
          } catch (err) {
            console.error("Code exchange error in AuthCodeHandler:", err);
            // Continue to callback route as fallback
          }
        }
        
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
