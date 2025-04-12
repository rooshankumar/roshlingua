
import { supabase } from '@/lib/supabase';

export const calculateUserProgress = async (userId: string) => {
  try {
    // Get total activities completed by user (you can customize these metrics)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('learning_language, proficiency_level')
      .eq('id', userId)
      .single();

    // Example progress calculation based on proficiency level
    const proficiencyLevels = ['beginner', 'intermediate', 'advanced', 'fluent'];
    const currentLevel = profileData?.proficiency_level || 'beginner';
    const progressPercentage = ((proficiencyLevels.indexOf(currentLevel) + 1) / proficiencyLevels.length) * 100;

    // Update progress in profile
    const { error } = await supabase
      .from('profiles')
      .update({ 
        progress_percentage: progressPercentage
      })
      .eq('id', userId);

    if (error) throw error;
    return progressPercentage;
  } catch (error) {
    console.error('Error calculating progress:', error);
    return 0;
  }
};
