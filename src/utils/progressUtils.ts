import { supabase } from '@/lib/supabase';

export const getXP = async (userId: string): Promise<{ xp: number, achievementPoints: number }> => {
  try {
    const [profileData, achievementsData] = await Promise.all([
      supabase.from('profiles').select('xp_points').eq('id', userId).single(),
      supabase.from('user_achievements').select('achievement_id').eq('user_id', userId)
    ]);

    const baseXP = profileData?.data?.xp_points || 0;
    const achievementPoints = achievementsData?.data?.reduce((total, ua) => {
      const achievement = ACHIEVEMENTS.find(a => a.id === ua.achievement_id);
      return total + (achievement?.points || 0);
    }, 0) || 0;

    return {
      xp: baseXP,
      achievementPoints
    };
  } catch (error) {
    console.error('Error fetching XP:', error);
    return {
      xp: 0,
      achievementPoints: 0
    };
  }
};

export const addXP = async (userId: string, actionType: string, achievementPoints: number = 0): Promise<{ xp: number, gained: number }> => {
  // First add XP from the action
  const { data: result } = await supabase
    .rpc('increment_xp', { 
      user_id: userId,
      action_type: actionType
    });

  if (!result) {
    console.error('Error adding XP');
    return { xp: 0, gained: 0 };
  }

  // If there are achievement points, add them directly to profile
  if (achievementPoints > 0) {
    await supabase
      .from('profiles')
      .update({ xp_points: (result.xp_points || 0) + achievementPoints })
      .eq('id', userId);
  }

  // Get final XP value
  const { data: profileData } = await supabase
    .from('profiles')
    .select('xp_points')
    .eq('id', userId)
    .single();

  return { 
    xp: profileData?.xp_points || 0,
    gained: (result.xp_gained || 0) + achievementPoints
  };
};

export const getLevel = (xp: number): string => {
  if (xp >= 1000) return 'Advanced';      // Advanced: 1000+ XP
  if (xp >= 500) return 'Intermediate';   // Intermediate: 500-999 XP
  return 'Beginner';                      // Beginner: 0-499 XP
};

export const getProgress = async (userId: string): Promise<number> => {
  const { xp, achievementPoints } = await getXP(userId);
  const totalXp = xp + achievementPoints;
  
  // Define level thresholds
  const beginnerMax = 500;
  const intermediateMax = 1000;
  
  // Calculate progress based on current level
  let progress = 0;
  if (totalXp >= intermediateMax) {
    // Advanced level (progress within advanced level)
    const nextMilestone = 2000; // Next major milestone for advanced
    progress = Math.min(100, Math.round(((totalXp - intermediateMax) / (nextMilestone - intermediateMax)) * 100));
  } else if (totalXp >= beginnerMax) {
    // Intermediate level
    progress = Math.min(100, Math.round(((totalXp - beginnerMax) / (intermediateMax - beginnerMax)) * 100));
  } else {
    // Beginner level
    progress = Math.min(100, Math.round((totalXp / beginnerMax) * 100));
  }
  
  return progress;
};