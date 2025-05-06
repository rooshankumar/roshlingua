import { supabase } from '@/lib/supabase';

export const updateUserActivity = async (userId: string) => {
  try {
    // First get current streak info
    const { data: currentData } = await supabase
      .from('profiles')
      .select('streak_count, last_seen')
      .eq('id', userId)
      .single();

    // Update last_seen to trigger streak calculation
    const { error } = await supabase
      .from('profiles')
      .update({ 
        last_seen: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    // Fetch updated streak
    const { data: updatedData } = await supabase
      .from('profiles')
      .select('streak_count')
      .eq('id', userId)
      .single();

    return updatedData?.streak_count;
  } catch (error) {
    console.error('Error updating user activity:', error);
    return null;
  }
};