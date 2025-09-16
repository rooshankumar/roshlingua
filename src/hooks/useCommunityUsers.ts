import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/user';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useCommunityUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = (await supabase.auth.getUser()).data.user;

      // Get the current timestamp to force a fresh request
      const timestamp = new Date().getTime();

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          age,
          bio,
          native_language,
          learning_language,
          proficiency_level,
          streak_count,
          avatar_url,
          likes_count,
          is_online
        `)
        .neq('id', currentUser?.id)
        .order('created_at', { ascending: false })
        .limit(100); // Add a reasonable limit to improve performance

      if (error) throw error;
      setUsers((data as unknown as User[]) || []);
      console.log(`Fetched ${data?.length || 0} users at ${timestamp}`);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const setupRealtimeSubscription = () => {
      // Clean up previous subscription if exists
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }

      channelRef.current = supabase
        .channel('community-users-realtime')
        .on('postgres_changes', 
          {
            event: '*',
            schema: 'public',
            table: 'profiles'
          }, 
          payload => {
            console.log('Realtime profile update:', payload);

            if (payload.new) {
              setUsers(prevUsers => {
                // Handle different event types
                if (payload.eventType === 'INSERT') {
                  // Don't add current user to the list
                  return [...prevUsers, payload.new as User];
                } 
                else if (payload.eventType === 'UPDATE') {
                  return prevUsers.map(user => 
                    user.id === payload.new.id ? { ...user, ...payload.new } : user
                  );
                }
                else if (payload.eventType === 'DELETE' && payload.old) {
                  return prevUsers.filter(user => user.id !== payload.old.id);
                }
                return prevUsers;
              });
            }
          }
        )
        .subscribe((status) => {
          console.log('Community users subscription status:', status);
        });
    };

    fetchUsers();
    setupRealtimeSubscription();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [fetchUsers]);

  // Function to manually refresh users
  const refreshUsers = async () => {
    setLoading(true);
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          age,
          bio,
          native_language,
          learning_language,
          proficiency_level,
          streak_count,
          avatar_url,
          likes_count,
          is_online
        `)
        .neq('id', currentUser?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as unknown as User[]) || []);
    } catch (err) {
      console.error('Error refreshing users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { users, loading, error, refreshUsers };
}