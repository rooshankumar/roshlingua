
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserPresence() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set(
          Object.values(state)
            .flat()
            .map((presence: any) => presence.user_id)
        );
        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
              last_seen: new Date().toISOString()
            });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { onlineUsers };
}
