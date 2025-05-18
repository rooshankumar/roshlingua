
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getPKCEVerifier, clearPKCEVerifier } from '@/utils/pkceHelper';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("Processing authentication callback...");
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          console.error("Auth provider error:", error, errorDescription);
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: errorDescription || error
          });
          navigate('/auth', { replace: true });
          return;
        }

        if (!code) {
          console.log("No auth code present, redirecting to auth");
          navigate('/auth', { replace: true });
          return;
        }

        // Clean up any existing auth state
        await supabase.auth.signOut();

        // Get PKCE verifier
        const verifier = getPKCEVerifier();
        if (!verifier) {
          throw new Error("No PKCE verifier found");
        }

        // Explicitly set verifier before exchange
        localStorage.setItem('supabase.auth.code_verifier', verifier);

        // Exchange the code for a session with the verifier
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) {
          throw sessionError;
        }

        if (!data?.session) {
          throw new Error("No session returned");
        }

        // Clear PKCE verifier after successful exchange
        clearPKCEVerifier();

        // Successful authentication
        toast({
          title: "Success",
          description: "Successfully signed in"
        });
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error("Authentication callback error:", error);
        
        // Clear any stale auth data
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
        clearPKCEVerifier();
        
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: "Please try signing in again"
        });
        navigate('/auth', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    handleCallback();
  }, [navigate, toast]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20"></div>
          <div className="h-2 w-24 rounded-full bg-primary/20"></div>
          <p className="text-muted-foreground">Completing authentication...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;
