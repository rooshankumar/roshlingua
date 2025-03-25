
import { useEffect } from 'react';
import { supabase, updateOnlineStatus, updateUserStreak } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { RealtimeChannel } from '@supabase/supabase-js';

const RealtimeStatus = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Update user's online status and streak when they access the app
    const setUserOnline = async () => {
      try {
        await updateOnlineStatus(user.id, true);
        await updateUserStreak(user.id);
      } catch (error) {
        console.error("Error updating online status or streak:", error);
      }
    };

    setUserOnline();

    // Set up event listeners for page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateOnlineStatus(user.id, true);
      } else {
        updateOnlineStatus(user.id, false);
      }
    };

    // Set up event listeners for window focus/blur
    const handleFocus = () => updateOnlineStatus(user.id, true);
    const handleBlur = () => updateOnlineStatus(user.id, false);

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Set up heartbeat to maintain online status
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateOnlineStatus(user.id, true);
      }
    }, 60000); // every minute

    // Set up beforeunload handler to mark user as offline when leaving
    const handleBeforeUnload = () => {
      try {
        // Using a synchronous approach since beforeunload doesn't wait for async
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Authorization', `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`);
        xhr.send(JSON.stringify({ is_online: false }));
      } catch (error) {
        console.error("Error in beforeunload handler:", error);
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
