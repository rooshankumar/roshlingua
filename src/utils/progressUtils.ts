import { supabase } from '@/lib/supabase';

export const getXP = async (userId: string): Promise<number> => {
  const { data } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', userId)
    .single();

  return data?.xp || 0;
};

export const addXP = async (userId: string, actionType: string): Promise<{ xp: number, gained: number }> => {
  const { data, error } = await supabase
    .rpc('increment_xp', { 
      user_id: userId,
      action_type: actionType
    });

  if (error) {
    console.error('Error adding XP:', error);
    return { xp: 0, gained: 0 };
  }

  return { 
    xp: data?.[0]?.xp_points || 0,
    gained: data?.[0]?.xp_gained || 0
  };

  // Check achievements after XP update
  const { data: lessonCount } = await supabase
    .from('learning_activities')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('type', 'lesson_completed');

  const stats = {
    xp: newXP,
    streak: user?.streak_count || 0,
    lessons: lessonCount || 0
  };

  // Use the achievements hook to check and update
  const { checkAchievements } = useAchievements(userId);
  await checkAchievements(stats);
};

export const getLevel = (xp: number): string => {
  if (xp >= 1000) return 'Advanced';      // Advanced: 1000+ XP
  if (xp >= 100) return 'Intermediate';   // Intermediate: 100-999 XP
  return 'Beginner';                      // Beginner: 0-99 XP
};

export const getProgress = async (userId: string): Promise<number> => {
  const { count } = await supabase
    .from('learning_activities')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('type', 'lesson_completed');

  const totalLessons = 20; // Total number of lessons
  return Math.min(100, Math.round(((count || 0) / totalLessons) * 100));
};