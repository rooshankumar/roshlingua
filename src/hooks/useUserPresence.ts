
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { updateUserPresence, setupPresenceEventListeners } from '@/utils/testAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useUserPresence() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isActive = true;
    
    const setupPresence = async () => {
      try {
        // Clean up any existing channel
        if (channelRef.current) {
          try {
            channelRef.current.unsubscribe();
          } catch (err) {
            console.error('Error unsubscribing from presence channel:', err);
          }
        }
        
        // Create a unique channel name with timestamp to prevent conflicts
        const channelName = `online-users-${Date.now()}`;
        
        const channel = supabase.channel(channelName, {
          config: {
            presence: {
              key: 'user_presence',
            },
          },
        });
        
        // Set up presence handlers
        channel
          .on('presence', { event: 'sync' }, () => {
            if (!isActive) return;
            
            const state = channel.presenceState();
            const online = new Set(
              Object.values(state)
                .flat()
                .map((presence: any) => presence.user_id)
            );
            setOnlineUsers(online);
            
            console.log('Presence sync - online users:', Array.from(online));
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('User joined:', newPresences);
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            console.log('User left:', leftPresences);
          });
          
        // Subscribe to the channel
        channel.subscribe(async (status) => {
          console.log('Presence channel status:', status);
          
          if (status === 'SUBSCRIBED') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id && isActive) {
              // Update database status
              await updateUserPresence(user.id, true);
              
              // Track presence
              await channel.track({
                user_id: user.id,
                online_at: new Date().toISOString(),
                last_seen: new Date().toISOString()
              });
              
              // Setup auto-refresh of presence status (every 5 minutes)
              if (presenceTimeoutRef.current) {
                clearInterval(presenceTimeoutRef.current);
              }
              
              presenceTimeoutRef.current = setInterval(async () => {
                if (document.visibilityState === 'visible') {
                  await updateUserPresence(user.id, true);
                  await channel.track({
                    user_id: user.id,
                    online_at: new Date().toISOString(),
                    last_seen: new Date().toISOString()
                  });
                }
              }, 5 * 60 * 1000); // 5 minutes
              
              // Set up presence event listeners
              setupPresenceEventListeners(user.id);
            }
          }
        });
        
        channelRef.current = channel;
      } catch (error) {
        console.error('Error setting up presence channel:', error);
      }
    };
    
    setupPresence();
    
    // Cleanup function
    return () => {
      isActive = false;
      
      if (presenceTimeoutRef.current) {
        clearInterval(presenceTimeoutRef.current);
        presenceTimeoutRef.current = null;
      }
      
      if (channelRef.current) {
        try {
          // Untrack presence
          channelRef.current.untrack();
          // Unsubscribe from channel
          channelRef.current.unsubscribe();
          channelRef.current = null;
        } catch (err) {
          console.error('Error cleaning up presence channel:', err);
        }
      }
      
      // Update user status to offline
      const getCurrentUser = async () => {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
          updateUserPresence(data.user.id, false);
        }
      };
      
      getCurrentUser();
    };
  }, []);

  return { onlineUsers };
}
