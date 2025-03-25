
import { useEffect } from 'react';
import { supabase, updateOnlineStatus, updateUserStreak } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const RealtimeStatus = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Update user's online status and streak when they access the app
    const setUserOnline = async () => {
      try {
        await updateOnlineStatus(user.id, true);
        
        // Try to update streak, but don't throw if it fails
        try {
          await updateUserStreak(user.id);
        } catch (streakError) {
          console.error("Error updating streak:", streakError);
          // Don't fail the whole operation if streak update fails
        }
      } catch (error) {
        console.error("Error updating online status:", error);
      }
    };

    setUserOnline();

    // Set up event listeners for page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateOnlineStatus(user.id, true).catch(err => 
          console.error("Error updating online status on visibility change:", err)
        );
      } else {
        updateOnlineStatus(user.id, false).catch(err => 
          console.error("Error updating offline status on visibility change:", err)
        );
      }
    };

    // Set up event listeners for window focus/blur
    const handleFocus = () => updateOnlineStatus(user.id, true)
      .catch(err => console.error("Error updating online status on focus:", err));
      
    const handleBlur = () => updateOnlineStatus(user.id, false)
      .catch(err => console.error("Error updating offline status on blur:", err));

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Set up heartbeat to maintain online status
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateOnlineStatus(user.id, true)
          .catch(err => console.error("Error updating online status on heartbeat:", err));
      }
    }, 60000); // every minute

    // Set up beforeunload handler to mark user as offline when leaving
    const handleBeforeUnload = () => {
      // Use navigator.sendBeacon for asynchronous request that works during page unload
      if (navigator.sendBeacon) {
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        headers.append('apikey', import.meta.env.VITE_SUPABASE_ANON_KEY);
        headers.append('Authorization', `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`);
        
        const data = JSON.stringify({ is_online: false });
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`;
        
        navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }));
      } else {
        // Fallback for browsers without sendBeacon support
        updateOnlineStatus(user.id, false).catch(err => 
          console.error("Error updating online status on unload:", err)
        );
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
      updateOnlineStatus(user.id, false).catch(error => 
        console.error("Error updating offline status on unmount:", error)
      );
    };
  }, [user]);

  // This component doesn't render anything
  return null;
};

export default RealtimeStatus;
