import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export const useRealtimeProfile = (userId: string) => {
  const [realtimeProfile, setRealtimeProfile] = useState(null);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        setRealtimeProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err);
      }
    };

    fetchProfile();

    // Set up realtime subscription
    const profileSubscription = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          setRealtimeProfile(payload.new);
        }
      )
      .subscribe();

    return () => {
      profileSubscription.unsubscribe();
    };
  }, [userId]);

  return { realtimeProfile, error };
};