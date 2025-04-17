
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function Callback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (error) throw error;
        if (!data.session) throw new Error('No session returned');

        navigate('/', { replace: true });
      } catch (error: any) {
        console.error('Login failed:', error.message);
        toast({
          variant: "destructive",
          title: "Authentication Failed",
          description: error.message
        });
        navigate('/auth', { replace: true });
      }
    };

    handleAuth();
  }, [navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Signing you in...</h2>
        <p className="text-sm text-muted-foreground">Please wait</p>
      </div>
    </div>
  );
}
