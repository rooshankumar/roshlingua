
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
  points: number;
  unlockedAt?: string;
}

export type AchievementCondition = {
  type: 'xp' | 'streak' | 'conversations' | 'lessons';
  threshold: number;
}

export interface UserAchievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}
