
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

    fetchUsers();
    setupRealtimeSubscription();

    // Cleanup subscription when component unmounts
    return () => {
      if (channel) channel.unsubscribe();
    };
  }, []);

  const refreshUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error refreshing users:', err);
      setError(err.message || 'Failed to refresh users');
    } finally {
      setLoading(false);
    }
  };

  return { users, loading, error, refreshUsers };
}
