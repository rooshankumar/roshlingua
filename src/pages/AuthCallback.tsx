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
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);

        if (error) throw error;
        if (!data.session) throw new Error('No session returned');

        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', data.session.user.id)
          .single();

        // Create profile if it doesn't exist
        if (!profile) {
          await supabase.from('profiles').insert({
            id: data.session.user.id,
            email: data.session.user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }

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
          title: "Authentication Failed",
          description: error.message
        });
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Processing login...</h2>
        <p className="text-sm text-muted-foreground">Please wait while we complete your authentication</p>
      </div>
    </div>
  );
};

export default AuthCallback;