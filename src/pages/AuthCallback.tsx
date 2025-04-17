
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("Processing authentication callback...");
        setIsLoading(true);
        
        // Exchange the code in the URL for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (error) {
          console.error("Authentication error:", error);
          throw error;
        }
        
        console.log("Session check result:", data.session ? "Session exists" : "No session");
        
        if (data?.session) {
          // Session exists, check if profile exists and if onboarding was completed
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', data.session.user.id)
            .single();
            
          if (profileError && profileError.code !== 'PGRST116') {
            console.error("Error fetching profile:", profileError);
          }
          
          // Create profile if it doesn't exist
          if (!profile) {
            console.log("Creating new profile for user:", data.session.user.id);
            const { error: insertError } = await supabase.from('profiles').insert({
              id: data.session.user.id,
              email: data.session.user.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_seen: new Date().toISOString(),
              onboarding_completed: false
            });
            
            if (insertError) {
              console.error("Error creating profile:", insertError);
            }
          }
          
          // Update last seen
          await supabase
            .from('profiles')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', data.session.user.id);
          
          // Redirect based on onboarding status
          setTimeout(() => {
            if (profile?.onboarding_completed) {
              console.log("Onboarding completed, redirecting to dashboard");
              navigate('/dashboard', { replace: true });
            } else {
              console.log("Onboarding not completed, redirecting to onboarding");
              navigate('/onboarding', { replace: true });
            }
          }, 500);
        } else {
          toast({
            title: "Authentication failed",
            description: "Could not authenticate with the provider",
            variant: "destructive"
          });
          navigate('/auth', { replace: true });
        }
      } catch (error) {
        console.error("Authentication callback error:", error);
        toast({
          title: "Authentication failed",
          description: "An error occurred during authentication",
          variant: "destructive"
        });
        navigate('/auth', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };
    
    handleCallback();
  }, [navigate, toast]);
  
  return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/20"></div>
        <div className="h-2 w-24 rounded-full bg-primary/20"></div>
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
