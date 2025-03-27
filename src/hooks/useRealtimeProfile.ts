
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { type Profile } from '@/lib/database.types';

export const useRealtimeProfile = (userId: string | undefined) => {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    fetchProfile();

    // Set up realtime subscription
    const channel = supabase
      .channel('profiles')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          if (payload.new.id === userId) {
            setProfile(payload.new as Profile);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }

    setProfile(data);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      throw error;
    }

    return fetchProfile();
  };

  return { profile, updateProfile };
};
