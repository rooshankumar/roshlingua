import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { checkOnboardingStatus } from '@/utils/onboardingUtils';

const AuthCodeHandler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Clear any potentially stale auth data on component mount
  useEffect(() => {
    const clearAuthDataIfNeeded = () => {
      const url = new URL(window.location.href);

      // If we're on the callback page with a fresh code or hash fragment
      if (url.searchParams.has('code') || window.location.hash.includes('access_token=')) {
        // Get new auth code if present (PKCE flow)
        const authCode = url.searchParams.get('code');
        const storedAuthCode = sessionStorage.getItem('supabase.auth.code');

        // Hash fragment indicates implicit flow
        const hasHashToken = window.location.hash.includes('access_token=');

        // If this is a new auth code or we have hash token, clean up all auth data
        if ((authCode && (!storedAuthCode || authCode !== storedAuthCode)) || hasHashToken) {
          console.log("New authentication data detected, clearing old auth state");

          // Clear all auth-related storage to ensure a clean state
          localStorage.removeItem('sb-auth-token');
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.removeItem('supabase.auth.token');
          localStorage.removeItem('supabase.auth.expires_at');
          sessionStorage.removeItem('supabase.auth.expires_at');

          // Keep track of the current auth code to detect changes
          if (authCode) {
            sessionStorage.setItem('supabase.auth.code', authCode);
          }
        }
      }
    };

    clearAuthDataIfNeeded();
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
            // Exchange the code for a session with better error handling
            console.log("Exchanging auth code for session");

            // Clear any stale verifiers to avoid conflicts
            localStorage.removeItem('supabase.auth.code_verifier');
            sessionStorage.removeItem('supabase.auth.code_verifier');

            // Exchange code for session with retry
            let sessionError = null;
            let data = null;
            let retryCount = 0;
            const maxRetries = 2;

            while (retryCount <= maxRetries) {
              try {
                const result = await supabase.auth.exchangeCodeForSession(code);
                data = result.data;
                sessionError = result.error;

                if (!sessionError) break;

                console.log(`Session exchange attempt ${retryCount + 1} failed:`, sessionError);

                // Clear any stale state before retry
                localStorage.removeItem('supabase.auth.token');
                localStorage.removeItem('supabase.auth.expires_at');

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 500));
                retryCount++;
              } catch (err) {
                console.error(`Session exchange exception (attempt ${retryCount + 1}):`, err);
                sessionError = err;
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            }

            if (sessionError) {
              throw sessionError;
            }

            if (!data?.session) {
              throw new Error("Could not establish a session");
            }

            await handleUserProfile(data.session.user);
          } catch (error) {
            console.error('Session exchange error:', error);

            // Handle various error types
            if (error.message && (
                error.message.includes('code verifier') || 
                error.message.includes('PKCE') ||
                error.message.includes('verification')
            )) {
              console.log("PKCE verification error detected, clearing all auth data");

              // Clear all auth-related data for a clean restart
              localStorage.removeItem('sb-auth-token');
              localStorage.removeItem('supabase.auth.token');
              sessionStorage.removeItem('supabase.auth.token');
              localStorage.removeItem('supabase.auth.expires_at');
              sessionStorage.removeItem('supabase.auth.expires_at');
              localStorage.removeItem('supabase.auth.code_verifier');
              sessionStorage.removeItem('supabase.auth.code_verifier');
              localStorage.removeItem('supabase.auth.code');
              sessionStorage.removeItem('supabase.auth.code');

              // Redirect to auth page to restart the flow
              toast({
                title: "Authentication Error",
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

    // Handle user profile creation/check
    const handleUserProfile = async (user) => {
      if (!user || !isMounted) return;

      try {
        console.log("Checking profile for user:", user.id);

        // Use a more reliable method to check for profile existence
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, onboarding_completed')
          .eq('id', user.id)
          .maybeSingle(); // Use maybeSingle instead of single to avoid errors when not found

        // If profile doesn't exist or there's an error (except not found)
        if (!profileData || (profileError && profileError.code !== 'PGRST116')) {
          if (profileError && profileError.code !== 'PGRST116') {
            console.error("Error fetching profile:", profileError);
          }

          // Create a new profile
          console.log("No profile found, creating new profile for user:", user.id);
          const userMetadata = user.user_metadata || {};

          // Use transaction to ensure profile is created
          const { error: insertError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              full_name: userMetadata.full_name || userMetadata.name || '',
              avatar_url: userMetadata.avatar_url || userMetadata.picture || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              onboarding_completed: false
            }, { 
              onConflict: 'id',
              returning: 'minimal'
            });

          if (insertError) {
            console.error("Error creating profile:", insertError);
            toast({
              variant: "destructive",
              title: "Profile Error",
              description: "Failed to create user profile. Please try again."
            });
            // Even if profile creation fails, we should still try to redirect to onboarding
          }

          console.log("Redirecting to onboarding for new user");
          if (isMounted) {
            // Always redirect to onboarding for new profiles
            navigate('/onboarding', { replace: true });
          }
          return;
        }

        // If profile exists, check if onboarding is completed
        console.log("Profile found, checking onboarding status:", profileData.onboarding_completed);
        if (isMounted) {
          if (profileData.onboarding_completed) {
            console.log("Onboarding completed, redirecting to dashboard");
            navigate('/dashboard', { replace: true });
          } else {
            console.log("Onboarding not completed, redirecting to onboarding");
            navigate('/onboarding', { replace: true });
          }
        }
      } catch (err) {
        console.error("Error in profile handling:", err);
        toast({
          variant: "destructive",
          title: "Profile Error",
          description: "Failed to process user profile. Please try refreshing the page."
        });
        // Attempt to redirect to onboarding as a fallback
        if (isMounted) navigate('/onboarding', { replace: true });
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