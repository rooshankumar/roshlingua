
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/lib/database.types';
import { supabase } from '@/lib/supabase';

type User = Database['public']['Tables']['users']['Row'];

export function useRealtimeProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
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
    const userSubscription = supabase
      .channel(`user:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`
      }, (payload) => {
        setProfile(payload.new as User);
      })
      .subscribe();

    return () => {
      userSubscription.unsubscribe();
    };
  }, [userId, toast]);

  const updateProfile = async (updates: Partial<User>) => {
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive"
      });
    }
  };

  return { profile, updateProfile, setProfile };
}
