
import { Achievement, UserAchievement } from '@/types/achievement';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAchievements } from '@/hooks/useAchievements';
import { useAuth } from '@/hooks/useAuth';

export function AchievementsList() {
  const { user } = useAuth();
  const { achievements, unlockedAchievements } = useAchievements(user?.id || '');

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {achievements.map((achievement) => {
        const isUnlocked = unlockedAchievements.some(
          ua => ua.achievement_id === achievement.id
        );
        
        return (
          <Card key={achievement.id} className={`transition-all duration-200 ${
            isUnlocked ? 'bg-primary/10' : 'opacity-75'
          }`}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{achievement.icon}</span>
                <div>
                  <CardTitle className="text-sm font-medium">
                    {achievement.title}
                  </CardTitle>
                  <CardDescription>
                    {achievement.description}
                  </CardDescription>
                </div>
              </div>
              <div className="mt-2">
                <Progress value={isUnlocked ? 100 : 0} />
              </div>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
