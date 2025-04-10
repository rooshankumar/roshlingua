
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
        // First try to get auth code from URL
        const code = new URLSearchParams(window.location.search).get('code');
        if (!code) {
          throw new Error('No code found in URL');
        }

        // Exchange code for session
        const { data: { session }, error: authError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (authError) throw authError;
        if (!session?.user) throw new Error('No session or user found');

        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
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
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Failed to complete authentication. Please try again."
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
