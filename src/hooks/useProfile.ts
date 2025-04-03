
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/user';

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select(`
            id,
            full_name,
            bio,
            native_language,
            learning_language, 
            proficiency_level,
            streak_count,
            avatar_url,
            likes_count,
            date_of_birth::text,
            onboarding_completed
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

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  return { profile, loading, error };
}
