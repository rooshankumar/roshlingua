
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Achievement, UserAchievement } from '@/types/achievement';
import { useToast } from '@/components/ui/use-toast';
import { Award } from 'lucide-react';

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-lesson',
    title: 'First Steps',
    description: 'Complete your first lesson',
    icon: '🎯',
    condition: { type: 'lessons', threshold: 1 },
    points: 50
  },
  {
    id: 'streak-3',
    title: 'Consistent Learner',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    condition: { type: 'streak', threshold: 3 },
    points: 100
  },
  {
    id: 'xp-500',
    title: 'Rising Star',
    description: 'Earn 500 XP',
    icon: '⭐',
    condition: { type: 'xp', threshold: 500 },
    points: 200
  },
  {
    id: 'streak-7',
    title: 'Weekly Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🗓️',
    condition: { type: 'streak', threshold: 7 },
    points: 300
  },
  {
    id: 'xp-1000',
    title: 'Language Master',
    description: 'Earn 1000 XP',
    icon: '👑',
    condition: { type: 'xp', threshold: 1000 },
    points: 400
  },
  {
    id: 'conversations-5',
    title: 'Social Butterfly',
    description: 'Have 5 conversations',
    icon: '🦋',
    condition: { type: 'conversations', threshold: 5 },
    points: 250
  },
  {
    id: 'lessons-10',
    title: 'Dedicated Student',
    description: 'Complete 10 lessons',
    icon: '📚',
    condition: { type: 'lessons', threshold: 10 },
    points: 300
  }
];

export function useAchievements(userId: string) {
  const [unlockedAchievements, setUnlockedAchievements] = useState<UserAchievement[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadUserAchievements();
    subscribeToAchievements();
  }, [userId]);

  const loadUserAchievements = async () => {
    const { data } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId);
    
    if (data) {
      setUnlockedAchievements(data);
    }
  };

  const subscribeToAchievements = () => {
    const subscription = supabase
      .channel('user_achievements')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_achievements',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const achievement = ACHIEVEMENTS.find(a => a.id === payload.new.achievement_id);
        if (achievement) {
          toast({
            title: '🎉 Achievement Unlocked!',
            description: `${achievement.title} - ${achievement.description}`,
            duration: 5000,
          });
          loadUserAchievements();
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const checkAchievements = async (stats: { xp: number; streak: number; lessons: number }) => {
    for (const achievement of ACHIEVEMENTS) {
      const isUnlocked = unlockedAchievements.some(ua => ua.achievement_id === achievement.id);
      if (!isUnlocked) {
        const statValue = stats[achievement.condition.type];
        if (statValue >= achievement.condition.threshold) {
          await unlockAchievement(achievement.id);
        }
      }
    }
  };

  const unlockAchievement = async (achievementId: string) => {
    const { error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString()
      });
    
    if (!error) {
      loadUserAchievements();
    }
  };

  return {
    achievements: ACHIEVEMENTS,
    unlockedAchievements,
    checkAchievements
  };
}
