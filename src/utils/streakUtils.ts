
import { supabase } from '@/lib/supabase';

export const updateUserActivity = async (userId: string) => {
  const { error } = await supabase
    .from('users')
    .update({ 
      last_seen: new Date().toISOString() 
    })
    .eq('id', userId);
    
  if (error) {
    console.error('Error updating user activity:', error);
  }
};
