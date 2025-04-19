
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const AuthCodeHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (isProcessing) return;
      setIsProcessing(true);

      try {
        // Check if there's a hash fragment with access_token (happens with implicit grant)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
          console.log("Found access token in URL hash, setting session");
          
          // Extract the access token from the hash
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const expiresIn = hashParams.get('expires_in');
          const tokenType = hashParams.get('token_type');
          
          if (accessToken) {
            // Set the session manually using the token from the hash
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
              expires_in: parseInt(expiresIn || '3600'),
              token_type: tokenType || 'bearer',
            });

            if (error) {
              console.error("Error setting session:", error);
              toast({
                variant: "destructive",
                title: "Authentication Failed",
                description: error.message
              });
              navigate('/auth', { replace: true });
              return;
            }
            
            // Check if profile exists
            if (data?.user) {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('onboarding_completed')
                .eq('id', data.user.id)
                .single();
                
              if (profileError && profileError.code !== 'PGRST116') {
                console.error("Error fetching profile:", profileError);
              }

              // If no profile found, create one
              if (!profileData) {
                const { error: insertError } = await supabase
                  .from('profiles')
                  .insert({
                    id: data.user.id,
                    email: data.user.email,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    onboarding_completed: false
                  });
                  
                if (insertError) {
                  console.error("Error creating profile:", insertError);
                }
                
                // Redirect to onboarding
                navigate('/onboarding', { replace: true });
                return;
              }
              
              // Redirect based on onboarding status
              navigate(profileData.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });
              return;
            }
          }
        }

        // Check if we have a session already
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session) {
          console.log("Session already exists, checking profile");
          
          // Check if profile exists
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', sessionData.session.user.id)
            .single();
            
          if (profileError && profileError.code !== 'PGRST116') {
            console.error("Error fetching profile:", profileError);
          }

          // If no profile found, create one
          if (!profileData) {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert({
                id: sessionData.session.user.id,
                email: sessionData.session.user.email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                onboarding_completed: false
              });
              
            if (insertError) {
              console.error("Error creating profile:", insertError);
            }
            
            // Redirect to onboarding
            navigate('/onboarding', { replace: true });
            return;
          }
          
          // Redirect based on onboarding status
          navigate(profileData.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });
          return;
        }

        // Otherwise we need to exchange the code from the URL
        console.log("No session, processing auth code exchange");
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        // Handle error case
        if (error) {
          console.error("Auth error:", error, errorDescription);
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: errorDescription || error
          });
          navigate('/auth', { replace: true });
          return;
        }

        // If no code is present, redirect to auth
        if (!code) {
          console.log("No auth code present, redirecting to auth");
          navigate('/auth', { replace: true });
          return;
        }

        // Exchange the code for a session
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

        if (sessionError) {
          console.error('Session exchange error:', sessionError);
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: sessionError.message
          });
          navigate('/auth', { replace: true });
          return;
        }

        if (!data.session) {
          toast({
            variant: "destructive",
            title: "Authentication Failed",
            description: "Could not establish a session. Please try again."
          });
          navigate('/auth', { replace: true });
          return;
        }

        // Create profile if needed
        const { data: profile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', data.session.user.id)
          .single();

        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          console.error("Profile check error:", profileCheckError);
        }

        // If profile doesn't exist, create it
        if (!profile) {
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: data.session.user.id,
              email: data.session.user.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              onboarding_completed: false
            });

          if (createError) {
            console.error("Error creating profile:", createError);
          }

          navigate('/onboarding', { replace: true });
          return;
        }

        // Redirect based on onboarding status
        navigate(profile.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });
      } catch (err) {
        console.error('Auth callback error:', err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred. Please try again."
        });
        navigate('/auth', { replace: true });
      } finally {
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate, toast, isProcessing]);

  return null;
};

export default AuthCodeHandler;
