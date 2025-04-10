import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { checkOnboardingStatus } from '@/utils/onboardingUtils';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          throw sessionError;
        }

        if (!session) {
          throw new Error('Authentication failed - no session established');
        }

        // Check if profile exists and onboarding status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Error checking profile:", profileError);
          throw profileError;
        }

        // If no profile exists, create one
        if (!profile) {
          const { error: createError } = await supabase
            .from('profiles')
            .insert([{
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              onboarding_completed: false
            }]);

          if (createError) throw createError;

          navigate('/onboarding', { replace: true });
          return;
        }

        // Navigate based on onboarding status
        navigate(profile.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        setError(error.message);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Failed to complete authentication."
        });
        navigate('/auth', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  if (error) {
    return <div>Authentication error: {error}</div>;
  }

  return <div>Completing authentication...</div>;
};

export default AuthCallback;