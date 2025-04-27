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
      // Enable realtime for the users table
      channel = supabase
        .channel('public:users')
        .on('postgres_changes', 
          {
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
        });
    };

    const setupSubscription = () => {
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
          if (status === 'SUBSCRIBED') {
            // Track user's presence
            await channel.track({
              user_id: supabase.auth.user()?.id,
              online_at: new Date().toISOString(),
            });
          }
        });
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