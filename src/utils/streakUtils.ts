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
      
    // If the streak was updated, check for streak-related achievements
    if (updatedData && (currentData?.streak_count !== updatedData.streak_count)) {
      try {
        // Dynamically import to avoid circular dependencies
        const { useAchievements } = await import('@/hooks/useAchievements');
        const { checkAchievements } = useAchievements(userId);
        
        // Check achievements with the updated streak count
        await checkAchievements({ streak: updatedData.streak_count });
      } catch (err) {
        console.error('Error checking achievements after streak update:', err);
      }
    }

    return updatedData?.streak_count;
  } catch (error) {
    console.error('Error updating user activity:', error);
    return null;
  }
};