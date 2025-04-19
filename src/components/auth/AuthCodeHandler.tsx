import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const AuthCodeHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Clear any potentially stale PKCE verifier on component mount
  useEffect(() => {
    const clearPKCEDataIfNeeded = () => {
      const url = new URL(window.location.href);
      // If we're on the callback page with a fresh code, clear any stale PKCE data
      if (url.searchParams.has('code')) {
        // Check if we need to clean up - only if there's a code but it's fresh (new login)
        const authCode = url.searchParams.get('code');
        const storedAuthCode = sessionStorage.getItem('supabase.auth.code');

        // If this is a new auth code (different from stored one), clean up PKCE data
        if (authCode && (!storedAuthCode || authCode !== storedAuthCode)) {
          console.log("New auth code detected, clearing old PKCE data");
          sessionStorage.setItem('supabase.auth.code', authCode);
        }
      }
    };

    clearPKCEDataIfNeeded();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const handleAuthCallback = async () => {
      if (isProcessing || !isMounted) return;
      setIsProcessing(true);

      try {
        // Check if there's a hash fragment with access_token (happens with implicit grant)
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
          console.log("Found access token in URL hash, setting session");

          try {
            // Extract the access token from the hash
            const hashParams = new URLSearchParams(hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const expiresIn = hashParams.get('expires_in');
            const expiresAt = hashParams.get('expires_at');
            const tokenType = hashParams.get('token_type');

            if (accessToken) {
              console.log("Extracted access token from URL hash");

              // Clear any existing auth data that might be stale
              localStorage.removeItem('supabase.auth.token');
              sessionStorage.removeItem('supabase.auth.token');
              localStorage.removeItem('sb-auth-token');

              // Set the session manually using the token from the hash
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
                expires_in: expiresIn ? parseInt(expiresIn) : 3600,
                expires_at: expiresAt ? parseInt(expiresAt) : Math.floor(Date.now() / 1000) + 3600,
                token_type: tokenType || 'bearer',
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

              // Remove the hash from the URL to prevent stale token issues on refresh
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
          }
        }

        // Check if we have a session already
        const { data: sessionData } = await supabase.auth.getSession();

        if (sessionData?.session && isMounted) {
          console.log("Session already exists, checking profile");
          await handleUserProfile(sessionData.session.user);
          return;
        }

        // Otherwise we need to exchange the code from the URL
        if (isMounted) {
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

          try {
            // Exchange the code for a session
            console.log("Exchanging auth code for session");
            const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

            if (sessionError) {
              throw sessionError;
            }

            if (!data.session) {
              throw new Error("Could not establish a session");
            }

            await handleUserProfile(data.session.user);
          } catch (error) {
            console.error('Session exchange error:', error);

            // If we get a PKCE error, clear storage and redirect to auth
            if (error.message && error.message.includes('code verifier')) {
              console.log("PKCE error detected, clearing auth data");
              localStorage.removeItem('supabase.auth.token');
              localStorage.removeItem('supabase.auth.expires_at');
              localStorage.removeItem('supabase.auth.code_verifier');
              sessionStorage.removeItem('supabase.auth.code_verifier');

              // Redirect to auth page to restart the flow
              toast({
                title: "Session Expired",
                description: "Please sign in again to continue.",
              });
              navigate('/auth', { replace: true });
              return;
            }

            toast({
              variant: "destructive",
              title: "Authentication Failed",
              description: error.message || "Failed to authenticate",
            });
            navigate('/auth', { replace: true });
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

    // Helper function to handle user profile creation/check
    const handleUserProfile = async (user) => {
      if (!user || !isMounted) return;

      try {
        try {
          // Use proper headers to avoid 406 errors
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single();

          if (profileError) {
            if (profileError.code !== 'PGRST116') {
              console.error("Error fetching profile:", profileError);
            }

            // If profile not found, create one
            console.log("Creating new profile for user:", user.id);
            const userMetadata = user.user_metadata || {};

            const { error: insertError } = await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                email: user.email,
                full_name: userMetadata.full_name || userMetadata.name,
                avatar_url: userMetadata.avatar_url || userMetadata.picture,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                onboarding_completed: false
              }, { onConflict: 'id' });

            if (insertError) {
              console.error("Error creating profile:", insertError);
              // If we can't create a profile, show an error toast
              toast({
                variant: "destructive",
                title: "Profile Error",
                description: "Failed to create user profile. Please try again."
              });
            }

            // Redirect to onboarding for new users
            if (isMounted) navigate('/onboarding', { replace: true });
            return;
          }

          // If profile exists, proceed with normal flow
          if (profileData) {
            console.log("Profile found, redirecting based on onboarding status");
            if (isMounted) {
              navigate(profileData.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });
            }
            return;
          }
        } catch (err) {
          console.error("Error in profile handling:", err);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to process user profile."
          });
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

    // Cleanup function to prevent state updates after unmounting
    return () => {
      isMounted = false;
    };
  }, [navigate, toast, isProcessing]);

  return null;
};

export default AuthCodeHandler;