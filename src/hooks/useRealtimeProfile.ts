
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useProfile } from './useProfiles';
import { useToast } from '@/hooks/use-toast';

export const useRealtimeProfile = (userId: string) => {
  const queryClient = useQueryClient();
  const { data: profile, isLoading, error, refetch } = useProfile(userId);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;
    
    let channel: RealtimeChannel;
    let retryCount = 0;
    const maxRetries = 3;

    // First check if the profile exists
    const checkProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
          
        if (error) {
          console.error("Error checking profile:", error);
          return;
        }
        
        // If profile doesn't exist and we have a userId, create it
        if (!data && userId) {
          console.log("Profile doesn't exist, creating it for:", userId);
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              updated_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error("Error creating profile:", insertError);
          } else {
            // Refetch after creating the profile
            refetch();
          }
        }
      } catch (err) {
        console.error("Unexpected error checking profile:", err);
      }
    };
    
    checkProfile();

    const setupRealtimeProfile = () => {
      try {
        channel = supabase
          .channel(`profile:${userId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          }, (payload) => {
            console.log('Profile update received:', payload);
            queryClient.invalidateQueries({ queryKey: ['profile', userId] });
          })
          .subscribe((status) => {
            console.log(`Realtime subscription status for profile:${userId}:`, status);
            if (status === 'SUBSCRIBED') {
              setIsSubscribed(true);
            } else if (status === 'CHANNEL_ERROR' && retryCount < maxRetries) {
              retryCount++;
              console.log(`Retrying realtime connection (${retryCount}/${maxRetries})...`);
              
              // Clean up current channel
              if (channel) {
                channel.unsubscribe();
              }
              
              // Retry after a short delay
              setTimeout(setupRealtimeProfile, 2000);
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Failed to establish realtime connection after multiple attempts');
              toast({
                variant: "default",
                title: "Connection issue",
                description: "Real-time updates might be delayed. We'll keep trying.",
              });
            }
          });
      } catch (err) {
        console.error('Error setting up realtime profile:', err);
      }
    };

    setupRealtimeProfile();

    return () => {
      if (channel) {
        console.log(`Unsubscribing from profile:${userId}`);
        channel.unsubscribe();
        setIsSubscribed(false);
      }
    };
  }, [userId, queryClient, toast, refetch]);

  return { profile, isLoading, error, isRealtimeConnected: isSubscribed, refetch };
};
