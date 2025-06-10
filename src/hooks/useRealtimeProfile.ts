import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useRealtimeProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            username,
            bio,
            native_language,
            learning_language,
            proficiency_level,
            learning_goal,
            email,
            date_of_birth,
            avatar_url,
            gender,
            streak_count,
            likes_count
          `)
          .eq('id', userId)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error("Error fetching profile:", err);
        toast({
          title: "Error",
          description: "Failed to fetch profile data.",
          variant: "destructive"
        });
      }
    };

    fetchProfile();

    // Set up realtime subscription
    const profileSubscription = supabase
      .channel(`profile:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`
      }, (payload) => {
        setProfile(payload.new as Profile);
      })
      .subscribe();

    return () => {
      profileSubscription.unsubscribe();
    };
  }, [userId, toast]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Update local state with the returned data
      if (data) {
        setProfile(data);
      } else {
        // Fallback: update local state with the updates
        setProfile(prev => prev ? { ...prev, ...updates } : null);
      }

      console.log('Profile updated successfully:', data);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [userId]);

  return { profile, updateProfile, setProfile };
}