
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getPKCEVerifier, clearPKCEVerifier } from '@/utils/pkceHelper';

const AuthCodeHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processingAuth, setProcessingAuth] = useState(false);

  useEffect(() => {
    const handleAuthRedirect = async () => {
      if (processingAuth) return;
      setProcessingAuth(true);

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: errorDescription || error
          });
          navigate('/auth', { replace: true });
          return;
        }

        if (!code) {
          setProcessingAuth(false);
          return;
        }

        const verifier = getPKCEVerifier();

        if (!verifier) {
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "Missing code verifier. Please try signing in again."
          });
          navigate('/auth', { replace: true });
          return;
        }

        // Exchange auth code for session
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code, verifier);

        if (sessionError) {
          console.error('Session exchange error:', sessionError);
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: sessionError.message
          });
          clearPKCEVerifier();
          navigate('/auth', { replace: true });
          return;
        }

        if (!data.session) {
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "Could not establish a session. Please try again."
          });
          clearPKCEVerifier();
          navigate('/auth', { replace: true });
          return;
        }

        clearPKCEVerifier();

        // Check profile after successful auth
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', data.session.user.id)
          .single();

        navigate(profile?.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });

      } catch (err) {
        console.error('Auth callback error:', err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred. Please try again."
        });
        clearPKCEVerifier();
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
