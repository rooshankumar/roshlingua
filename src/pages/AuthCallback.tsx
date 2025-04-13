
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // First get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        // If no session found, try to exchange the code
        if (!session) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
          if (!data.session) throw new Error('No session returned');
        }

        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError || new Error('No user found');

        // Create profile if it doesn't exist and check onboarding status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .upsert({ 
            id: user.id,
            email: user.email,
            onboarding_completed: false,
            created_at: new Date().toISOString()
          }, { 
            onConflict: 'id'
          })
          .select('onboarding_completed')
          .single();

        // If error in profile creation/check, or onboarding not completed, redirect to onboarding
        if (profileError || !profile?.onboarding_completed) {
          navigate('/onboarding', { replace: true });
          return;
        }

        // If everything is good, go to dashboard
        navigate('/dashboard', { replace: true });

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

    handleAuth();
  }, [navigate, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <h2 className="text-2xl font-semibold">Signing you in...</h2>
        <p className="text-muted-foreground">Please wait while we verify your account</p>
      </div>
    </div>
  );
};

export default AuthCallback;
