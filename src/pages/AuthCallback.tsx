
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get code from URL
        const code = new URLSearchParams(window.location.search).get('code');
        if (!code) {
          throw new Error('No code found in URL');
        }

        // Exchange code for session
        const { data: { session }, error: authError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (authError) {
          console.error('Auth error:', authError);
          throw authError;
        }

        if (!session?.user) {
          throw new Error('No user in session');
        }

        // Check if user profile exists
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile error:', profileError);
          throw profileError;
        }

        // Navigate based on profile status
        if (!profile || !profile.onboarding_completed) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "There was a problem signing you in. Please try again."
        });
        navigate('/auth', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/20"></div>
        <div className="h-2 w-24 rounded-full bg-primary/20"></div>
      </div>
    </div>
  );
};

export default AuthCallback;
