import { supabase } from '@/lib/supabase';

export const updateUserActivity = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        last_seen: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating user activity:', error);
  }
};