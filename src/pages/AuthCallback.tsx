
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getPKCEVerifier, clearPKCEVerifier, storePKCEVerifier } from '@/utils/pkceHelper';

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

        // Get PKCE verifier from storage
        const verifier = getPKCEVerifier();
        console.log("Got verifier:", verifier ? "Yes" : "No", "Length:", verifier?.length);

        if (!verifier) {
          console.error("No PKCE verifier found");
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.removeItem('supabase.auth.token');
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Security verification failed. Please try signing in again."
          });
          navigate('/auth', { replace: true });
          return;
        }

        // Clean up any existing session data
        await supabase.auth.signOut();
        
        // Exchange the code for a session
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) {
          console.error("Session exchange error:", sessionError);
          clearPKCEVerifier();
          throw sessionError;
        }

        if (!data?.session) {
          clearPKCEVerifier();
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

export default AuthCallback;
