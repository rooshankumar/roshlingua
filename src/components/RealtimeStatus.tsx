
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useUpdateStreak } from '@/hooks/useProfiles';
import { useToast } from '@/hooks/use-toast';

const RealtimeStatus = () => {
  const { user } = useAuth();
  const updateStreak = useUpdateStreak();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    // Update user's online status and streak when they access the app
    const setUserOnline = async () => {
      try {
        console.log("Setting user online:", user.id);
        
        // First check if the profile exists
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
          
        if (checkError) {
          console.error("Error checking profile existence:", checkError);
          // Continue anyway to attempt update
        }
        
        // If profile doesn't exist, insert it
        if (!existingProfile) {
          console.log("Profile doesn't exist, creating it");
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              is_online: true,
              updated_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error("Error creating profile:", insertError);
            throw insertError;
          }
        } else {
          // Profile exists, update it
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              is_online: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
            
          if (updateError) {
            console.error("Error updating online status:", updateError);
            throw updateError;
          }
        }
        
        // Try to update streak
        try {
          await updateStreak.mutateAsync(user.id);
        } catch (streakError) {
          console.error("Error updating streak:", streakError);
          // Don't fail the whole operation if streak update fails
        }
      } catch (error) {
        console.error("Error in RealtimeStatus:", error);
        toast({
          variant: "destructive",
          title: "Connection status",
          description: "Online status may not be updated correctly.",
        });
      }
    };

    setUserOnline();

    // Set up event listeners for page visibility changes
    const handleVisibilityChange = () => {
      if (!user) return;
      
      if (document.visibilityState === 'visible') {
        supabase
          .from('profiles')
          .update({
            is_online: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.error("Error updating online status:", error);
          });
      } else {
        supabase
          .from('profiles')
          .update({
            is_online: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.error("Error updating offline status:", error);
          });
      }
    };

    // Set up event listeners for window focus/blur
    const handleFocus = () => {
      if (!user) return;
      
      supabase
        .from('profiles')
        .update({
          is_online: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error("Error updating online status on focus:", error);
        });
    };
      
    const handleBlur = () => {
      if (!user) return;
      
      supabase
        .from('profiles')
        .update({
          is_online: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error("Error updating offline status on blur:", error);
        });
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Set up heartbeat to maintain online status
    const heartbeatInterval = setInterval(() => {
      if (!user || document.visibilityState !== 'visible') return;
      
      supabase
        .from('profiles')
        .update({
          is_online: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error("Error updating online status on heartbeat:", error);
        });
    }, 60000); // every minute

    // Set up beforeunload handler to mark user as offline when leaving
    const handleBeforeUnload = () => {
      if (!user) return;
      
      // Use navigator.sendBeacon for asynchronous request that works during page unload
      try {
        supabase
          .from('profiles')
          .update({
            is_online: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.error("Error updating offline status on unload:", error);
          });
      } catch (error) {
        console.error("Error updating offline status on unload:", error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(heartbeatInterval);
      
      // Mark user as offline when component unmounts
      if (user) {
        supabase
          .from('profiles')
          .update({
            is_online: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.error("Error updating offline status on unmount:", error);
          });
      }
    };
  }, [user, updateStreak, toast]);

  // This component doesn't render anything
  return null;
};

export default RealtimeStatus;
