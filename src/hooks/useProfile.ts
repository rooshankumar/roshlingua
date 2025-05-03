import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/user';

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setLoading(false); //Set loading to false if no userId is provided
        return;
      }
      try {
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
            date_of_birth::text,
            xp_points,
            created_at
          `)
          .eq('id', userId)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile(); //Removed the userId conditional, the null check is now inside fetchProfile

  }, [userId]);

  return { profile, loading, error };
}