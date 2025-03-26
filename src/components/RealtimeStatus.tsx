
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
        // First ensure the profile exists and is marked as online
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            is_online: true,
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (profileError) {
          console.error("Error updating online status:", profileError);
          throw profileError;
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
          title: "Connection error",
          description: "Failed to update online status. Please refresh the page.",
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
          .upsert({
            id: user.id,
            is_online: true,
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .then(({ error }) => {
            if (error) console.error("Error updating online status:", error);
          });
      } else {
        supabase
          .from('profiles')
          .upsert({
            id: user.id,
            is_online: false,
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'id',
            ignoreDuplicates: false
          })
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
        .upsert({
          id: user.id,
          is_online: true,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .then(({ error }) => {
          if (error) console.error("Error updating online status on focus:", error);
        });
    };
      
    const handleBlur = () => {
      if (!user) return;
      
      supabase
        .from('profiles')
        .upsert({
          id: user.id,
          is_online: false,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false
        })
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
        .upsert({
          id: user.id,
          is_online: true,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .then(({ error }) => {
          if (error) console.error("Error updating online status on heartbeat:", error);
        });
    }, 60000); // every minute

    // Set up beforeunload handler to mark user as offline when leaving
    const handleBeforeUnload = () => {
      if (!user) return;
      
      // Use navigator.sendBeacon for asynchronous request that works during page unload
      if (navigator.sendBeacon) {
        try {
          const headers = new Headers();
          headers.append('Content-Type', 'application/json');
          headers.append('apikey', import.meta.env.VITE_SUPABASE_ANON_KEY || "");
          headers.append('Authorization', `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ""}`);
          
          const data = JSON.stringify({ 
            id: user.id,
            is_online: false,
            updated_at: new Date().toISOString()
          });
          const url = `${import.meta.env.VITE_SUPABASE_URL || ""}/rest/v1/profiles?id=eq.${user.id}`;
          
          navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }));
        } catch (error) {
          console.error("Error with sendBeacon:", error);
        }
      } else {
        // Fallback for browsers without sendBeacon support
        fetch(`${import.meta.env.VITE_SUPABASE_URL || ""}/rest/v1/profiles?id=eq.${user.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || "",
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ""}`
          },
          body: JSON.stringify({ 
            is_online: false,
            updated_at: new Date().toISOString()
          }),
          keepalive: true
        }).catch(err => console.error("Error updating online status on unload:", err));
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
          .upsert({
            id: user.id,
            is_online: false,
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'id',
            ignoreDuplicates: false
          })
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
