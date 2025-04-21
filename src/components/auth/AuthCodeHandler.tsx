import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const AuthCodeHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const handleAuthCallback = async () => {
      if (isProcessing || !isMounted) return;
      setIsProcessing(true);

      try {
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
          console.log("Found access token in URL hash, setting session");

          try {
            const hashParams = new URLSearchParams(hash.substring(1));
            const accessToken = hashParams.get('access_token');

            if (accessToken) {
              console.log("Extracted access token from URL hash");

              localStorage.removeItem('supabase.auth.token');
              sessionStorage.removeItem('supabase.auth.token');
              localStorage.removeItem('sb-auth-token');

              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: '',
              });

              if (error) {
                console.error("Error setting session:", error);
                toast({
                  variant: "destructive",
                  title: "Authentication Failed",
                  description: error.message || "Failed to establish session"
                });
                navigate('/auth', { replace: true });
                return;
              }

              console.log("Session set successfully from hash params");

              if (window.history && window.history.replaceState) {
                window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
              }

              if (data?.user) {
                await handleUserProfile(data.user);
                return;
              }
            }
          } catch (hashError) {
            console.error("Error processing hash fragment:", hashError);
            toast({
              variant: "destructive",
              title: "Authentication Error",
              description: "Failed to process authentication data"
            });
          } finally {
            setIsProcessing(false);
          }
        } else {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            console.error("Error getting session:", sessionError);
            toast({
              variant: "destructive",
              title: "Authentication Error",
              description: sessionError.message || "Failed to retrieve session"
            });
            navigate('/auth', { replace: true });
            return;
          }

          if (sessionData?.session && isMounted) {
            console.log("Session already exists, checking profile");
            await handleUserProfile(sessionData.session.user);
            return;
          } else {
            console.log("No session, processing auth code exchange");
            const url = new URL(window.location.href);
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');
            const errorDescription = url.searchParams.get('error_description');

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

            if (!code) {
              console.log("No auth code present, redirecting to auth");
              navigate('/auth', { replace: true });
              return;
            }

            try {
              console.log("Exchanging auth code for session");

              const { data, error } = await supabase.auth.exchangeCodeForSession(code);

              if (error) {
                console.error('Session exchange error:', error);
                toast({
                  variant: "destructive",
                  title: "Authentication Failed",
                  description: error.message || "Failed to authenticate",
                });
                navigate('/auth', { replace: true });
                return;
              }

              if (data?.session) {
                await handleUserProfile(data.session.user);
              } else {
                toast({
                  variant: "destructive",
                  title: "Authentication Failed",
                  description: "Could not establish a session",
                });
                navigate('/auth', { replace: true });
              }
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
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        if (isMounted) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "An unexpected error occurred. Please try again."
          });
          navigate('/auth', { replace: true });
        }
      } finally {
        if (isMounted) {
          setIsProcessing(false);
        }
      }
    };

    const handleUserProfile = async (user) => {
      if (!user || !isMounted) return;

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (profileError) {
          if (profileError.code !== 'PGRST116') {
            console.error("Error fetching profile:", profileError);
            toast({
              variant: "destructive",
              title: "Profile Error",
              description: "Failed to retrieve user profile."
            });
          } else {
            console.log("Creating new profile for user:", user.id);
          }

          const userMetadata = user.user_metadata || {};

          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: userMetadata.full_name || userMetadata.name || '',
              avatar_url: userMetadata.avatar_url || userMetadata.picture || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              onboarding_completed: false
            });

          if (insertError) {
            console.error("Error creating profile:", insertError);
            toast({
              variant: "destructive",
              title: "Profile Error",
              description: "Failed to create user profile. Some features may be limited."
            });
          }

          if (isMounted) navigate('/onboarding', { replace: true });
          return;
        }

        if (profileData) {
          console.log("Profile found, redirecting based on onboarding status");
          if (isMounted) {
            navigate(profileData.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });
          }
          return;
        }
      } catch (error) {
        console.error("Error handling user profile:", error);
        if (isMounted) {
          toast({
            variant: "destructive",
            title: "Profile Error",
            description: "Failed to retrieve or create user profile.",
          });
        }
      }
    };

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate, toast, isProcessing]);

  return null;
};

export default AuthCodeHandler;
