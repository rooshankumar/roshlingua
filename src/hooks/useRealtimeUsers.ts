import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { User } from '@/lib/database.types';

export function useRealtimeUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        // Fetch initial users list
        const { data, error } = await supabase
          .from('users')
          .select('*, profiles(*)') // Join with profiles to get public data
          .order('created_at', { ascending: false });

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    const setupRealtimeSubscription = () => {
      let retryTimeout: number | null = null;
      const maxRetries = 5;
      let retryCount = 0;

      const subscribe = () => {
        // Enable realtime for the users table
        channel = supabase
          .channel('public:users')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'users'
          },
            payload => {
              console.log('Realtime users update:', payload);
              // Refetch the entire list to ensure we have the latest data
              fetchUsers();
            }
          )
          .subscribe((status) => {
            console.log('Realtime subscription status:', status);
            if (status === 'SUBSCRIBED') {
              retryCount = 0;
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              if (retryCount < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
                console.log(`Connection closed, retrying in ${delay}ms (${retryCount + 1}/${maxRetries})`);
                if (retryTimeout) window.clearTimeout(retryTimeout);
                retryTimeout = window.setTimeout(() => {
                  retryCount++;
                  channel.unsubscribe();
                  subscribe();
                }, delay);
              }
            }
          });
      };
      subscribe();
    };


    const setupSubscription = () => {
      let retryTimeout: number | null = null;
      const maxRetries = 5;
      let retryCount = 0;
      const subscribe = () => {
          channel = supabase
            .channel('online-users')
            .on('presence', { event: 'sync' }, () => {
              // Handle presence sync
              const presenceState = channel.presenceState();
              const onlineUserIds = Object.keys(presenceState);

              setUsers(prevUsers =>
                prevUsers.map(user => ({
                  ...user,
                  is_online: onlineUserIds.includes(user.id)
                }))
              );
            })
            .subscribe(async (status) => {
              console.log('Realtime subscription status:', status);
              if (status === 'SUBSCRIBED') {
                retryCount = 0;
                // Track user's presence
                await channel.track({
                  user_id: supabase.auth.user()?.id,
                  online_at: new Date().toISOString(),
                });
              } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                // Attempt to reconnect with exponential backoff
                if (retryCount < maxRetries) {
                  const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
                  console.log(`Connection closed, retrying in ${delay}ms (${retryCount + 1}/${maxRetries})`);
                  if (retryTimeout) window.clearTimeout(retryTimeout);
                  retryTimeout = window.setTimeout(() => {
                    retryCount++;
                    channel.unsubscribe();
                    subscribe();
                  }, delay);
                }
              }
            });
      };
      subscribe();
    };

    // Initial fetch and subscription setup
    fetchUsers();
    setupRealtimeSubscription();
    setupSubscription();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, []);

  return { users, loading, error };
}