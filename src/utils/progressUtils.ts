import { supabase } from '@/lib/supabase';

export const getXP = async (userId: string): Promise<number> => {
  const { data } = await supabase
    .from('profiles')
    .select('xp_points')
    .eq('id', userId)
    .single();

  return data?.xp_points || 0;
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
};

export const getLevel = (xp: number): string => {
  if (xp >= 1000) return 'Advanced';      // Advanced: 1000+ XP
  if (xp >= 500) return 'Intermediate';   // Intermediate: 500-999 XP
  return 'Beginner';                      // Beginner: 0-499 XP
};

export const getProgress = async (userId: string): Promise<number> => {
  const xp = await getXP(userId);
  const nextLevel = xp >= 1000 ? 2000 : xp >= 500 ? 1000 : 500;
  const currentLevelBase = xp >= 1000 ? 1000 : xp >= 500 ? 500 : 0;
  return Math.min(100, Math.round(((xp - currentLevelBase) / (nextLevel - currentLevelBase)) * 100));
};