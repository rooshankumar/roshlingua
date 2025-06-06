import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Achievement, UserAchievement } from '@/types/achievement';
import { useToast } from '@/components/ui/use-toast';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-chat',
    title: 'First Steps',
    description: 'Start your first conversation',
    icon: '🎯',
    category: 'social',
    level: 'bronze',
    condition: { type: 'conversations', threshold: 1 },
    points: 10
  },
  {
    id: 'streak-3',
    title: 'Consistent Learner',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    category: 'milestone',
    level: 'bronze',
    condition: { type: 'streak', threshold: 3 },
    points: 30
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
    id: 'messages-50',
    title: 'Active Chatter',
    description: 'Send 50 messages',
    icon: '💬',
    category: 'social',
    level: 'gold',
    condition: { type: 'messages', threshold: 50 },
    points: 300
  },
  {
    id: 'winter-2024',
    title: 'Winter Champion',
    description: 'Stay active during winter 2024',
    icon: '❄️',
    category: 'special',
    level: 'silver',
    condition: { type: 'streak', threshold: 1 },
    points: 150
  }
];

export function useAchievements(userId: string) {
  const [unlockedAchievements, setUnlockedAchievements] = useState<UserAchievement[]>([]);
  const { toast } = useToast();
  const [userXP, setUserXP] = useState(0); // Added state for user XP

  useEffect(() => {
    if (!userId) return; // Added null check for userId
    loadUserAchievements();
    subscribeToAchievements();
    loadUserXP(); // Load user XP on mount
  }, [userId]);

  const loadUserAchievements = async () => {
    if (!userId) return; // Added null check for userId
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error loading achievements:', error);
        return;
      }

      if (data) {
        setUnlockedAchievements(data);
      }
    } catch (err) {
      console.error('Exception loading achievements:', err);
    }
  };

  const loadUserXP = async () => {
    if (!userId) return; // Added null check for userId
    const { data: profileData } = await supabase
      .from('profiles')
      .select('xp_points')
      .eq('id', userId)
      .single();
    setUserXP(profileData?.xp_points || 0);
  };


  const subscribeToAchievements = () => {
    if (!userId) return; // Added null check for userId
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
            title: `${achievement.icon} Achievement Unlocked!`,
            description: `${achievement.title}\n${achievement.description}\n+${achievement.points} points`,
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
    if (!userId) return; // Added null check for userId

    // Get latest profile data including XP and streak
    const { data: profileData } = await supabase
      .from('profiles')
      .select('xp_points, streak_count')
      .eq('id', userId)
      .single();

    const currentXP = profileData?.xp_points || 0;
    const currentStreak = profileData?.streak_count || 0;

    console.log('Checking achievements with XP:', currentXP, 'Streak:', currentStreak);

    for (const achievement of ACHIEVEMENTS) {
      const isUnlocked = unlockedAchievements.some(ua => ua.achievement_id === achievement.id);
      if (!isUnlocked) {
        let statValue;

        if (achievement.condition.type === 'xp') {
          statValue = currentXP;
        } else if (achievement.condition.type === 'streak') {
          statValue = currentStreak; // Use streak from database directly
        } else {
          statValue = stats[achievement.condition.type] || 0;
        }

        console.log(`Checking achievement ${achievement.id}: ${statValue} >= ${achievement.condition.threshold}`);

        if (statValue >= achievement.condition.threshold) {
          await unlockAchievement(achievement.id);
        }
      }
    }
  };

  const unlockAchievement = async (achievementId: string) => {
    if (!userId) return; // Added null check for userId
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return;

    const { error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString()
      });

    if (!error) {
      // Add achievement points directly through progressUtils
      await addXP(userId, 'achievement_unlock', achievement.points);
      loadUserAchievements();
      loadUserXP();
    }
  };

  // Implement addXP function using Supabase function
  const addXP = async (userId: string, source: string, amount: number) => {
    try {
      const { data, error } = await supabase.rpc('increment_xp', {
        user_id: userId,
        action_type: source
      });

      if (error) throw error;

      console.log(`Added ${amount} XP from ${source}`);
      return data;
    } catch (error) {
      console.error('Error adding XP:', error);
      return null;
    }
  };

  return {
    achievements: ACHIEVEMENTS,
    unlockedAchievements,
    checkAchievements
  };
}