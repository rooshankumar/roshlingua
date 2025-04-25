
import { Achievement, UserAchievement } from '@/types/achievement';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAchievements } from '@/hooks/useAchievements';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const LEVEL_COLORS = {
  bronze: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
  silver: 'bg-slate-300/20 text-slate-700 border-slate-300/30',
  gold: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30'
};

const CATEGORY_ICONS = {
  learning: '📚',
  social: '👥',
  milestone: '🏆',
  special: '✨'
};

export function AchievementsList() {
  const { user } = useAuth();
  const { achievements, unlockedAchievements } = useAchievements(user?.id || '');

  const getTotalPoints = () => {
    return unlockedAchievements.reduce((total, ua) => {
      const achievement = achievements.find(a => a.id === ua.achievement_id);
      return total + (achievement?.points || 0);
    }, 0);
  };

  const getRank = (points: number) => {
    if (points >= 1000) return { title: 'Master', icon: '👑' };
    if (points >= 500) return { title: 'Expert', icon: '⭐' };
    if (points >= 200) return { title: 'Intermediate', icon: '🌟' };
    return { title: 'Beginner', icon: '🌱' };
  };

  const currentRank = getRank(getTotalPoints());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Achievements
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-2xl">{currentRank.icon}</span>
            <div>
              <p className="font-medium">{currentRank.title} Level</p>
              <p className="text-muted-foreground">
                {getTotalPoints()} Points Total
              </p>
            </div>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">
              {((unlockedAchievements.length / achievements.length) * 100).toFixed(0)}%
            </p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {achievements.map((achievement) => {
          const isUnlocked = unlockedAchievements.some(
            ua => ua.achievement_id === achievement.id
          );
          
          return (
            <motion.div
              key={achievement.id}
              whileHover={{ scale: 1.02 }}
              initial={false}
              animate={isUnlocked ? { opacity: 1 } : { opacity: 0.7 }}
            >
              <Card className={cn(
                "transition-all duration-300 border-2 overflow-hidden",
                isUnlocked 
                  ? `${LEVEL_COLORS[achievement.level]} shadow-lg shadow-primary/5` 
                  : "border-dashed hover:border-primary/30"
              )}>
                <CardHeader className="relative">
                  {isUnlocked && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 animate-shimmer"/>
                  )}
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center text-3xl relative",
                      isUnlocked 
                        ? "bg-gradient-to-br from-primary/20 to-primary/5" 
                        : "bg-muted"
                    )}>
                      {isUnlocked && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 260, damping: 20 }}
                          className="absolute inset-0 bg-primary/10 rounded-xl"
                        />
                      )}
                      <span className="relative z-10">{achievement.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-medium">
                          {achievement.title}
                        </CardTitle>
                        <span className="text-sm">{CATEGORY_ICONS[achievement.category]}</span>
                      </div>
                      <CardDescription className="mt-1">
                        {achievement.description}
                      </CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          LEVEL_COLORS[achievement.level]
                        )}>
                          {achievement.level}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {achievement.points} points
                        </span>
                      </div>
                    </div>
                  </div>
                  <Progress 
                    value={isUnlocked ? 100 : 0} 
                    className={cn(
                      "mt-4",
                      isUnlocked && "bg-primary/30"
                    )}
                  />
                </CardHeader>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
