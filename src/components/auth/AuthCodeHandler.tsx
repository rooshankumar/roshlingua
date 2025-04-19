import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getPKCEVerifier, exchangeAuthCode, debugPKCEState, clearPKCEVerifier, storePKCEVerifier } from '@/utils/pkceHelper';

const AuthCodeHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processingAuth, setProcessingAuth] = useState(false);

  const recoverVerifierFromCookie = () => {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if ((name.includes('verifier') || name.includes('code') || name.includes('pkce')) && value && value.length > 20) {
        localStorage.setItem('supabase.auth.code_verifier', value);
        sessionStorage.setItem('supabase.auth.code_verifier', value);
        return true;
      }
    }
    return false;
  };

  const checkForEmergencyRecovery = () => {
    if (recoverVerifierFromCookie()) {
      return localStorage.getItem('supabase.auth.code_verifier');
    }

    const storageKeys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)];
    for (const key of storageKeys) {
      if (key.includes('verifier') || key.includes('code') || key.includes('pkce')) {
        const value = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (value && value.length > 20) {
          localStorage.setItem('supabase.auth.code_verifier', value);
          sessionStorage.setItem('supabase.auth.code_verifier', value);
          return value;
        }
      }
    }

    return null;
  };

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

        let verifier = getPKCEVerifier();

        if (!verifier) {
          verifier = checkForEmergencyRecovery();

          if (!verifier) {
            toast({
              variant: "destructive",
              title: "Authentication Failed",
              description: "Missing security code verifier. Please try again."
            });
            navigate('/auth', { replace: true });
            return;
          }
        }

        if (!verifier || verifier.length < 20) {
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "Invalid security code verifier. Please try again."
          });
          navigate('/auth', { replace: true });
          return;
        }

        const { data, error: sessionError } = await exchangeAuthCode(code);

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
              .single()
              .headers({
                'Accept': '*/*',
                'Content-Type': 'application/json'
              });

            if (profileError) throw profileError;

            if (profileData && profileData.onboarding_completed) {
              navigate('/dashboard', { replace: true });
            } else {
              navigate('/onboarding', { replace: true });
            }
          } catch (profileError) {
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