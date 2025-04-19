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

        // Get the verifier that was stored during the initial auth request
        const verifier = getPKCEVerifier();

        if (!verifier) {
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "Missing security code verifier. Please try again."
          });
          navigate('/auth', { replace: true });
          return;
        }

        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code, { code_verifier: verifier });

        if (sessionError) {
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: sessionError.message
          });
          clearPKCEVerifier();
          navigate('/auth', { replace: true });
          return;
        }

        if (data.session) {
          clearPKCEVerifier();
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', data.session.user.id)
              .single();

            if (profileError) throw profileError;

            navigate(profileData?.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });
          } catch (error) {
            navigate('/dashboard', { replace: true });
          }
          return;
        }

        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: "Could not establish a session. Please try again."
        });
        clearPKCEVerifier();
        navigate('/auth', { replace: true });
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