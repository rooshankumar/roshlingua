
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/user';

export function useCommunityUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const currentUser = (await supabase.auth.getUser()).data.user;
        
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
            last_active_at
          `)
          .neq('id', currentUser?.id)
          .order('last_active_at', { ascending: false });

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, loading, error };
}
