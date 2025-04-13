
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get code from either hash or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Handle the callback directly with the full URL
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (sessionError) {
          throw sessionError;
        }

        if (!data.session) {
          throw new Error('No session returned');
        }

        // Check onboarding status
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', data.session.user.id)
          .single();

        // Redirect based on onboarding status
        if (profile?.onboarding_completed) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
      } catch (error: any) {
        console.error('Auth callback error:', error);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: error.message || "Failed to complete authentication"
        });
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Completing authentication...</h2>
        <p className="text-sm text-muted-foreground">Please wait while we sign you in</p>
      </div>
    </div>
  );
};

export default AuthCallback;
