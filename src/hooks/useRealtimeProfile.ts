
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useProfile } from './useProfiles';

export const useRealtimeProfile = (userId: string) => {
  const queryClient = useQueryClient();
  const { data: profile, error, isLoading } = useProfile(userId);

  useEffect(() => {
    if (!userId) return;
    
    let channel: RealtimeChannel;

    const setupRealtimeProfile = () => {
      channel = supabase
        .channel(`profile:${userId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        }, (payload) => {
          console.log('Profile changed:', payload);
          queryClient.invalidateQueries({ queryKey: ['profile', userId] });
        })
        .subscribe((status) => {
          console.log('Realtime subscription status for profile:', status);
        });
    };

    setupRealtimeProfile();

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [userId, queryClient]);

  return { profile, error, isLoading };
};
