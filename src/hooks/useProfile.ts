
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
            email,
            full_name,
            age,
            bio,
            native_language,
            learning_language,
            proficiency_level,
            streak_count,
            last_active_at,
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
