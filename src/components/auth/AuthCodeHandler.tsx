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

        const handleUserProfile = async (user) => {
            if (!user || !isMounted) return;

            try {
                // Set proper headers for all requests
                supabase.rest.headers({
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                });

                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('onboarding_completed')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profileError && profileError.code !== 'PGRST116') {
                    console.error("Error fetching profile:", profileError);
                    throw profileError;
                }

                if (!profileData) {
                    const userMetadata = user.user_metadata || {};

                    // Prepare profile data with all required fields
                    const newProfileData = {
                        id: user.id,
                        user_id: user.id, // Ensure user_id is set
                        email: user.email,
                        full_name: userMetadata.full_name || userMetadata.name || '',
                        avatar_url: userMetadata.avatar_url || userMetadata.picture || '',
                        onboarding_completed: false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert([newProfileData]);

                    if (insertError) {
                        console.error("Error creating profile:", insertError);
                        throw insertError;
                    }

                    if (isMounted) {
                        navigate('/onboarding', { replace: true });
                    }
                    return;
                }

                // Redirect based on onboarding status
                if (isMounted) {
                    navigate(profileData.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });
                }
            } catch (error) {
                console.error("Error handling user profile:", error);
                if (isMounted) {
                    toast({
                        variant: "destructive",
                        title: "Profile Error",
                        description: "Failed to setup user profile. Please try again.",
                    });
                    navigate('/auth', { replace: true });
                }
            }
        };

        const handleAuthCallback = async () => {
            if (isProcessing || !isMounted) return;
            setIsProcessing(true);

            try {
                const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);

                if (error) {
                    throw error;
                }

                if (data?.session) {
                    await handleUserProfile(data.session.user);
                } else {
                    throw new Error("No session established");
                }
            } catch (err) {
                console.error('Auth callback error:', err);
                if (isMounted) {
                    toast({
                        variant: "destructive",
                        title: "Authentication Error",
                        description: err.message || "Failed to authenticate. Please try again.",
                    });
                    navigate('/auth', { replace: true });
                }
            } finally {
                if (isMounted) {
                    setIsProcessing(false);
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