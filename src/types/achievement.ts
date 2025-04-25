
export type AchievementCategory = 'learning' | 'social' | 'milestone' | 'special';
export type AchievementLevel = 'bronze' | 'silver' | 'gold';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  level: AchievementLevel;
  condition: AchievementCondition;
  points: number;
  unlockedAt?: string;
}

export type AchievementCondition = {
  type: 'xp' | 'streak' | 'conversations' | 'messages';
  threshold: number;
}

export interface UserAchievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}
