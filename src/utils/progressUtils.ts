
import { supabase } from '@/lib/supabase';

// XP points for different activities
const XP_REWARDS = {
  DAILY_LOGIN: 10,
  COMPLETE_LESSON: 50,
  CHAT_INTERACTION: 5,
  STREAK_MILESTONE: 100, // Every 7 days
};

// Proficiency level thresholds
const PROFICIENCY_THRESHOLDS = {
  beginner: { min: 0, max: 1000 },
  intermediate: { min: 1001, max: 3000 },
  advanced: { min: 3001, max: 6000 },
  fluent: { min: 6001, max: Infinity }
};

export const calculateUserProgress = async (userId: string) => {
  try {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('xp_points, streak_count, learning_language, proficiency_level')
      .eq('id', userId)
      .single();

    if (!profileData) return 0;

    // Calculate proficiency level based on XP
    const xp = profileData.xp_points || 0;
    let currentLevel = 'beginner';
    
    for (const [level, threshold] of Object.entries(PROFICIENCY_THRESHOLDS)) {
      if (xp >= threshold.min && xp <= threshold.max) {
        currentLevel = level;
        break;
      }
    }

    // Calculate progress percentage within current level
    const currentThreshold = PROFICIENCY_THRESHOLDS[currentLevel as keyof typeof PROFICIENCY_THRESHOLDS];
    const progressInLevel = ((xp - currentThreshold.min) / (currentThreshold.max - currentThreshold.min)) * 100;
    const progressPercentage = Math.min(Math.max(progressInLevel, 0), 100);

    // Update profile with new progress and level if changed
    if (currentLevel !== profileData.proficiency_level) {
      await supabase
        .from('profiles')
        .update({ 
          proficiency_level: currentLevel,
          progress_percentage: progressPercentage
        })
        .eq('id', userId);
    }

    return progressPercentage;
  } catch (error) {
    console.error('Error calculating progress:', error);
    return 0;
  }
};

export const awardXP = async (userId: string, activity: keyof typeof XP_REWARDS) => {
  try {
    const xpAmount = XP_REWARDS[activity];
    
    const { data: { xp_points } } = await supabase
      .rpc('increment_xp', { 
        user_id: userId, 
        xp_increment: xpAmount 
      });

    // Recalculate progress after XP award
    await calculateUserProgress(userId);
    
    return xpAmount;
  } catch (error) {
    console.error('Error awarding XP:', error);
    return 0;
  }
};
