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
      .select('streak_count, xp_points')
      .eq('id', userId)
      .single();

    if (updatedData) {
      // Check for achievement updates
      await checkStreakAchievements(userId, updatedData.streak_count, updatedData.xp_points || 0);
    }

    return updatedData?.streak_count;
  } catch (error) {
    console.error('Error updating user activity:', error);
    return null;
  }
};

// Function to check streak-based achievements
const checkStreakAchievements = async (userId: string, streakCount: number, xpPoints: number) => {
  try {
    // Get existing achievements
    const { data: existingAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    const unlockedIds = existingAchievements?.map(a => a.achievement_id) || [];

    // Check for streak achievements
    if (streakCount >= 3 && !unlockedIds.includes('streak-3')) {
      await unlockAchievement(userId, 'streak-3');
    }
    
    if (streakCount >= 7 && !unlockedIds.includes('streak-7')) {
      await unlockAchievement(userId, 'streak-7');
    }
    
    // While we're here, also check for XP achievements
    if (xpPoints >= 500 && !unlockedIds.includes('xp-500')) {
      await unlockAchievement(userId, 'xp-500');
    }
    
    if (xpPoints >= 1000 && !unlockedIds.includes('xp-1000')) {
      await unlockAchievement(userId, 'xp-1000');
    }
    
  } catch (error) {
    console.error('Error checking streak achievements:', error);
  }
};

// Function to unlock an achievement
const unlockAchievement = async (userId: string, achievementId: string) => {
  try {
    console.log(`Unlocking achievement ${achievementId} for user ${userId}`);
    
    // Insert the achievement
    const { error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString()
      });
      
    if (error) throw error;
    
    // Find the points value for this achievement
    const ACHIEVEMENTS = [
      { id: 'streak-3', points: 30 },
      { id: 'streak-7', points: 300 },
      { id: 'xp-500', points: 200 },
      { id: 'xp-1000', points: 400 }
    ];
    
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    
    if (achievement) {
      // Add XP points for the achievement
      await supabase.rpc('increment_xp', {
        user_id: userId,
        action_type: 'achievement_unlock'
      });
    }
    
  } catch (error) {
    console.error('Error unlocking achievement:', error);
  }
};