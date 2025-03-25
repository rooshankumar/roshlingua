
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useProfile } from './useProfiles';

export const useRealtimeProfile = (userId: string) => {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile(userId);

  useEffect(() => {
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
          queryClient.invalidateQueries({ queryKey: ['profile', userId] });
        })
        .subscribe();
    };

    setupRealtimeProfile();

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [userId, queryClient]);

  return profile;
};
