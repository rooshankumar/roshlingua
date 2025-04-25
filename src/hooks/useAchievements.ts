import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Achievement, UserAchievement } from '@/types/achievement';
import { useToast } from '@/components/ui/use-toast';

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-lesson',
    title: 'First Steps',
    description: 'Complete your first lesson',
    icon: '🎯',
    category: 'learning',
    level: 'bronze',
    condition: { type: 'lessons', threshold: 1 },
    points: 50
  },
  {
    id: 'streak-3',
    title: 'Consistent Learner',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    category: 'milestone',
    level: 'bronze',
    condition: { type: 'streak', threshold: 3 },
    points: 100
  },
  {
    id: 'xp-500',
    title: 'Rising Star',
    description: 'Earn 500 XP',
    icon: '⭐',
    category: 'milestone',
    level: 'silver',
    condition: { type: 'xp', threshold: 500 },
    points: 200
  },
  {
    id: 'streak-7',
    title: 'Weekly Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🗓️',
    category: 'milestone',
    level: 'silver',
    condition: { type: 'streak', threshold: 7 },
    points: 300
  },
  {
    id: 'xp-1000',
    title: 'Language Master',
    description: 'Earn 1000 XP',
    icon: '👑',
    category: 'milestone',
    level: 'gold',
    condition: { type: 'xp', threshold: 1000 },
    points: 400
  },
  {
    id: 'conversations-5',
    title: 'Social Butterfly',
    description: 'Have 5 conversations',
    icon: '🦋',
    category: 'social',
    level: 'silver',
    condition: { type: 'conversations', threshold: 5 },
    points: 250
  },
  {
    id: 'lessons-10',
    title: 'Dedicated Student',
    description: 'Complete 10 lessons',
    icon: '📚',
    category: 'learning',
    level: 'gold',
    condition: { type: 'lessons', threshold: 10 },
    points: 300
  },
  {
    id: 'winter-2024',
    title: 'Winter Champion',
    description: 'Complete a lesson during winter 2024',
    icon: '❄️',
    category: 'special',
    level: 'silver',
    condition: { type: 'lessons', threshold: 1 },
    points: 150
  }
];

export function useAchievements(userId: string) {
  const [unlockedAchievements, setUnlockedAchievements] = useState<UserAchievement[]>([]);
  const { toast } = useToast();
  const [userXP, setUserXP] = useState(0); // Added state for user XP

  useEffect(() => {
    loadUserAchievements();
    subscribeToAchievements();
    loadUserXP(); // Load user XP on mount
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

  const loadUserXP = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('xp_points')
      .eq('id', userId)
      .single();
    setUserXP(profileData?.xp_points || 0);
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
            title: (
              <div className="flex items-center gap-2">
                <span className="text-xl">{achievement.icon}</span>
                <span>Achievement Unlocked!</span>
              </div>
            ),
            description: (
              <div className="space-y-2">
                <p className="font-medium">{achievement.title}</p>
                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                <p className="text-sm font-medium text-primary">+{achievement.points} points</p>
              </div>
            ),
            duration: 6000,
          });
          loadUserAchievements();
          loadUserXP(); //update XP after achievement unlock
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const checkAchievements = async (stats: { xp: number; streak: number; lessons: number }) => {
    // Get latest XP from profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('xp_points')
      .eq('id', userId)
      .single();
    
    const currentXP = profileData?.xp_points || 0;

    for (const achievement of ACHIEVEMENTS) {
      const isUnlocked = unlockedAchievements.some(ua => ua.achievement_id === achievement.id);
      if (!isUnlocked) {
        const statValue = achievement.condition.type === 'xp' 
          ? currentXP 
          : stats[achievement.condition.type];
          
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