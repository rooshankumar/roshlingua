
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
        const { data, error } = await supabase.auth.getSession();
        
        // If we already have a session, go to dashboard
        if (data?.session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', data.session.user.id)
            .single();

          if (profile?.onboarding_completed) {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/onboarding', { replace: true });
          }
          return;
        }

        // Otherwise exchange the code
        const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (authError) throw authError;
        if (!authData.session) throw new Error('No session returned');

        // Check onboarding status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.session.user.id)
          .single();

        if (profileError) {
          // If profile doesn't exist, create it
          const user = authData.session.user;
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              onboarding_completed: false
            });

          if (createError) throw createError;
          navigate('/onboarding', { replace: true });
          return;
        }

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
