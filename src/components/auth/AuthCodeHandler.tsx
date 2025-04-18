import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

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
        console.log("Detected authentication parameters");
        console.log("Auth code present:", !!code);
        console.log("Auth error present:", !!error);
        
        // Check for code verifier
        const codeVerifier = localStorage.getItem('supabase.auth.code_verifier');
        console.log("Code verifier exists:", !!codeVerifier);
        
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