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
        
        // Check for code verifier and ensure it's synchronized across storage mechanisms
        const codeVerifier = localStorage.getItem('supabase.auth.code_verifier') || 
                             sessionStorage.getItem('supabase.auth.code_verifier');
        
        console.log("Code verifier exists:", !!codeVerifier);
        
        // If found in any storage, sync it to all storage options
        if (codeVerifier) {
          try {
            localStorage.setItem('supabase.auth.code_verifier', codeVerifier);
            sessionStorage.setItem('supabase.auth.code_verifier', codeVerifier);
            document.cookie = `pkce_verifier=${codeVerifier};max-age=600;path=/;SameSite=Lax`;
            console.log("Synchronized code verifier across storage mechanisms");
          } catch (err) {
            console.error("Failed to sync code verifier:", err);
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