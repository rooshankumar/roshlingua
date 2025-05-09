
import { supabase } from '@/lib/supabase';
import { ACHIEVEMENTS } from '@/hooks/useAchievements';

// Main function to check all achievements for a user
export const checkAllAchievements = async (userId: string) => {
  if (!userId) return;
  console.log('Checking all achievements for user:', userId);

  try {
    // 1. Get current user stats
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('streak_count, xp_points')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error('Error fetching profile data:', profileError);
      return;
    }

    // 2. Get conversation count
    const { count: conversationCount, error: convError } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
      
    if (convError) {
      console.error('Error counting conversations:', convError);
      return;
    }

    // 3. Get message count
    const { count: messageCount, error: msgError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', userId);
      
    if (msgError) {
      console.error('Error counting messages:', msgError);
      return;
    }

    // 4. Get existing achievements
    const { data: existingAchievements, error: achievementError } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);
      
    if (achievementError) {
      console.error('Error fetching existing achievements:', achievementError);
      return;
    }

    const unlockedIds = existingAchievements?.map(a => a.achievement_id) || [];
    console.log('Current stats:', {
      streak: profileData.streak_count,
      xp: profileData.xp_points,
      conversations: conversationCount,
      messages: messageCount
    });
    console.log('Current unlocked achievements:', unlockedIds);

    // 5. Check each achievement
    for (const achievement of ACHIEVEMENTS) {
      if (unlockedIds.includes(achievement.id)) continue;

      let shouldUnlock = false;
      
      switch (achievement.condition.type) {
        case 'streak':
          shouldUnlock = (profileData.streak_count || 0) >= achievement.condition.threshold;
          break;
        case 'xp':
          shouldUnlock = (profileData.xp_points || 0) >= achievement.condition.threshold;
          break;
        case 'conversations':
          shouldUnlock = (conversationCount || 0) >= achievement.condition.threshold;
          break;
        case 'messages':
          shouldUnlock = (messageCount || 0) >= achievement.condition.threshold;
          break;
      }
      
      if (shouldUnlock) {
        console.log(`Unlocking achievement: ${achievement.id}`);
        await unlockAchievement(userId, achievement.id);
      }
    }
  } catch (error) {
    console.error('Error in checkAllAchievements:', error);
  }
};

// Function to unlock a specific achievement
export const unlockAchievement = async (userId: string, achievementId: string) => {
  try {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return;

    // Insert the achievement
    const { error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error unlocking achievement:', error);
      return;
    }

    // Add XP for the achievement
    await supabase.rpc('increment_xp', {
      user_id: userId,
      action_type: 'achievement_unlock'
    });
    
    console.log(`Achievement unlocked: ${achievement.title} (+${achievement.points} XP)`);
  } catch (error) {
    console.error('Error in unlockAchievement:', error);
  }
};
