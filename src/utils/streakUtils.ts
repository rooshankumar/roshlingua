import { supabase } from '@/lib/supabase';

// Function to check streak-based achievements
export const checkStreakAchievements = async (userId: string, streakCount?: number, xpPoints?: number) => {
  try {
    console.log(`Checking achievements for user ${userId} with streak ${streakCount} and XP ${xpPoints}`);

    // If streakCount and xpPoints weren't provided, fetch them
    if (streakCount === undefined || xpPoints === undefined) {
      // Get current streak and XP information
      const { data: userData, error } = await supabase
        .from('profiles')
        .select('streak_count, xp_points')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user data for achievement check:', error);
        return;
      }

      if (userData) {
        streakCount = userData.streak_count || 0;
        xpPoints = userData.xp_points || 0;
      } else {
        console.warn("User data not found for achievement check.");
        return;
      }
    }

    // Get existing achievements
    const { data: existingAchievements, error: achievementError } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    if (achievementError) {
      console.error('Error fetching existing achievements:', achievementError);
      return;
    }

    const unlockedIds = existingAchievements?.map(a => a.achievement_id) || [];
    console.log('Current unlocked achievements:', unlockedIds);

    // Check for streak achievements
    if (streakCount >= 3 && !unlockedIds.includes('streak-3')) {
      console.log('Unlocking streak-3 achievement');
      await unlockAchievement(userId, 'streak-3');
    }

    if (streakCount >= 7 && !unlockedIds.includes('streak-7')) {
      console.log('Unlocking streak-7 achievement');
      await unlockAchievement(userId, 'streak-7');
    }

    // While we're here, also check for XP achievements
    if (xpPoints >= 500 && !unlockedIds.includes('xp-500')) {
      console.log('Unlocking xp-500 achievement');
      await unlockAchievement(userId, 'xp-500');
    }

    if (xpPoints >= 1000 && !unlockedIds.includes('xp-1000')) {
      console.log('Unlocking xp-1000 achievement');
      await unlockAchievement(userId, 'xp-1000');
    }

  } catch (error) {
    console.error('Error checking streak achievements:', error);
  }
};

export const updateUserActivity = async (userId: string) => {
  try {
    // First get current streak info
    const { data: currentData, error: currentDataError } = await supabase
      .from('profiles')
      .select('streak_count, last_seen')
      .eq('id', userId)
      .single();

    if(currentDataError){
        console.error("Error fetching current user data:", currentDataError);
        return null;
    }

    // Update last_seen to trigger streak calculation
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        last_seen: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Fetch updated streak
    const { data: updatedData, error: updatedDataError } = await supabase
      .from('profiles')
      .select('streak_count, xp_points')
      .eq('id', userId)
      .single();

    if(updatedDataError){
        console.error("Error fetching updated user data:", updatedDataError);
        return null;
    }

    if (updatedData) {
      // Check for achievement updates
      await checkStreakAchievements(userId, updatedData.streak_count, updatedData.xp_points || 0);
    } else {
        console.warn("Updated user data not found.");
        return null;
    }

    return updatedData?.streak_count;
  } catch (error) {
    console.error('Error updating user activity:', error);
    return null;
  }
};

// Function to unlock an achievement
const unlockAchievement = async (userId: string, achievementId: string) => {
  try {
    console.log(`Unlocking achievement ${achievementId} for user ${userId}`);

    // Check if achievement already exists to prevent duplicates
    const { data: existingAchievement, error: existingAchievementError } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .maybeSingle();

    if(existingAchievementError){
        console.error("Error checking for existing achievement:", existingAchievementError);
        return;
    }

    if (existingAchievement) {
      console.log(`Achievement ${achievementId} already unlocked for user ${userId}`);
      return;
    }

    // Insert the achievement
    const { error: insertError } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString()
      });

      if(insertError){
          console.error("Error inserting achievement:", insertError);
          return;
      }

    console.log(`Successfully unlocked achievement ${achievementId}`);

    // Find the points value for this achievement
    const ACHIEVEMENTS = [
      { id: 'streak-3', points: 30 },
      { id: 'streak-7', points: 300 },
      { id: 'xp-500', points: 200 },
      { id: 'xp-1000', points: 400 }
    ];

    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);

    if (achievement) {
      console.log(`Adding ${achievement.points} XP for achievement ${achievementId}`);
      // Add XP points for the achievement
      const { error: xpError } = await supabase.rpc('increment_xp', {
        user_id: userId,
        action_type: 'achievement_unlock'
      });

      if (xpError) {
        console.error('Error incrementing XP:', xpError);
      }
    }

  } catch (error) {
    console.error('Error unlocking achievement:', error);
  }
};