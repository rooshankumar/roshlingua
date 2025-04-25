
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Achievements</h2>
          <p className="text-muted-foreground">Total Points: {getTotalPoints()}</p>
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
                "transition-all duration-200 border-2",
                isUnlocked ? LEVEL_COLORS[achievement.level] : "border-dashed"
              )}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center text-2xl",
                      isUnlocked ? "bg-primary/10" : "bg-muted"
                    )}>
                      {achievement.icon}
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
