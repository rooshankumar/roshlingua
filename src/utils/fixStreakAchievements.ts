
import { supabase } from '@/lib/supabase';
import { ACHIEVEMENTS } from '@/hooks/useAchievements';

export async function fixStreakAchievements() {
  try {
    // Get all users with streak count >= 3 who don't have the streak-3 achievement
    const { data: eligibleUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, streak_count')
      .gte('streak_count', 3);
    
    if (usersError) throw usersError;
    
    if (!eligibleUsers || eligibleUsers.length === 0) {
      console.log('No eligible users found with streaks of 3+ days');
      return { fixed: 0 };
    }
    
    let fixedCount = 0;
    
    // For each eligible user, check if they already have the streak-3 achievement
    for (const user of eligibleUsers) {
      const { data: existingAchievement } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .eq('achievement_id', 'streak-3')
        .maybeSingle();
      
      // If user doesn't have the achievement yet, grant it
      if (!existingAchievement) {
        const achievement = ACHIEVEMENTS.find(a => a.id === 'streak-3');
        if (!achievement) continue;
        
        const { error: insertError } = await supabase
          .from('user_achievements')
          .insert({
            user_id: user.id,
            achievement_id: 'streak-3',
            unlocked_at: new Date().toISOString()
          });
          
        if (!insertError) {
          fixedCount++;
          
          // Add the achievement points to user's XP
          await addXpForAchievement(user.id, achievement.points);
          
          console.log(`Fixed streak achievement for user ${user.id}`);
        } else {
          console.error(`Error fixing streak achievement for user ${user.id}:`, insertError);
        }
      }
    }
    
    return { fixed: fixedCount };
  } catch (error) {
    console.error('Error fixing streak achievements:', error);
    return { error };
  }
}

async function addXpForAchievement(userId: string, points: number) {
  // Get current XP
  const { data: profileData } = await supabase
    .from('profiles')
    .select('xp_points')
    .eq('id', userId)
    .single();
  
  if (profileData) {
    // Update XP (adding achievement points)
    await supabase
      .from('profiles')
      .update({ 
        xp_points: (profileData.xp_points || 0) + points 
      })
      .eq('id', userId);
  }
}
