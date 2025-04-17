import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const AuthCodeHandler = () => {
  const navigate = useNavigate();

  // Handle the code parameter in the URL (for Google OAuth)
  useEffect(() => {
    // Skip if not on the main app page with a code param
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');

    if (code && window.location.pathname === '/') {
      console.log("Detected code parameter, handling OAuth callback...");

      const handleAuthWithCode = async () => {
        try {
          // Exchange the authorization code for a session
          // Using the full URL ensures we have access to all needed parameters
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);

          if (error) {
            console.error("Error exchanging code for session:", error);
            return;
          }

          if (data.session) {
            console.log("Successfully authenticated with OAuth");

            // Check if the user is new or existing
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', data.session.user.id)
              .single();

            if (profileError && profileError.code !== 'PGRST116') {
              console.error("Error fetching profile:", profileError);
              navigate('/auth', { replace: true });
              return;
            }

            // Create profile if it doesn't exist
            if (!profile) {
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

              // New user, redirect to onboarding
              navigate('/onboarding', { replace: true });
            } else if (profile.onboarding_completed) {
              // Existing user with completed onboarding
              navigate('/dashboard', { replace: true });
            } else {
              // Existing user who hasn't completed onboarding
              navigate('/onboarding', { replace: true });
            }
          }
        } catch (error) {
          console.error("Error in OAuth code exchange:", error);
        }
      };

      handleAuthWithCode();
    }
  }, [navigate]);

  return null;
};

export default AuthCodeHandler;