import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const AuthCodeHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (isProcessing) return;
      setIsProcessing(true);

      try {
        // Get the code from URL
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        // Handle error case
        if (error) {
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: errorDescription || error
          });
          navigate('/auth', { replace: true });
          return;
        }

        // If no code is present, return
        if (!code) {
          setIsProcessing(false);
          return;
        }

        // Exchange the code for a session
        // No need to manually pass a verifier - Supabase handles this internally
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) {
          console.error('Session exchange error:', sessionError);
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: sessionError.message
          });
          navigate('/auth', { replace: true });
          return;
        }

        // If no session was created, show error
        if (!data.session) {
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "Could not establish a session. Please try again."
          });
          navigate('/auth', { replace: true });
          return;
        }

        // Get user profile to check if onboarding is completed
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', data.session.user.id)
          .single();

        // Redirect based on onboarding status
        navigate(profile?.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });
      } catch (err) {
        console.error('Auth callback error:', err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred. Please try again."
        });
        navigate('/auth', { replace: true });
      } finally {
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate, toast, isProcessing]);

  return null;
};

export default AuthCodeHandler;