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
        const { data: { session }, error: authError } = await supabase.auth.getSession();

        if (authError) {
          throw authError;
        }

        if (!session?.user) {
          throw new Error('No user in session');
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            username: session.user.email?.split('@')[0] || 'user',
            bio: '',
            likes_count: 0,
            is_online: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          throw profileError;
        }

        navigate('/dashboard', { replace: true });
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