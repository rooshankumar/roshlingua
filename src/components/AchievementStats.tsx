
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function AchievementStats() {
  const [stats, setStats] = useState<{[key: string]: number}>({});
  
  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from('user_achievements')
        .select('achievement_id, count(*)')
        .group_by('achievement_id');
      
      if (data) {
        const statsMap = data.reduce((acc, curr) => ({
          ...acc,
          [curr.achievement_id]: curr.count
        }), {});
        setStats(statsMap);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Achievement Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(stats).map(([achievementId, count]) => (
            <div key={achievementId} className="flex justify-between items-center">
              <span>{achievementId}</span>
              <span>{count} users</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
