import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AchievementStats } from "@/components/AchievementStats";
import { 
  Activity, Award, Flame, 
  MessageSquare,
  TrendingUp, Target, Book
} from "lucide-react";
import { 
  Card, CardContent, CardDescription, 
  CardHeader, CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useUserPresence } from "@/hooks/useUserPresence";
import * as progressUtils from "@/utils/progressUtils";
import { cn } from "@/lib/utils";

import { useAchievements, ACHIEVEMENTS } from '@/hooks/useAchievements';
import { AchievementsList } from '@/components/AchievementsList';
import { checkAllAchievements } from '@/utils/achievementTrigger';

const Dashboard = () => {
  const { user } = useAuth();
  const { onlineUsers } = useUserPresence();
  const [userStats, setUserStats] = useState({
    streak: 0,
    xp: 0,
    progress: 0,
    level: 'Beginner',
    achievementPoints: 0,
    totalXP: 0
  });
  const [stats, setStats] = useState({
    conversations: 0,
    xp: 0,
    proficiency_level: 'beginner'
  });

  const getXP = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('xp_points')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data?.xp_points || 0;
    } catch (error) {
      console.error("Error fetching XP:", error);
      return 0;
    }
  };

  const getProgress = async (userId) => {
    try {
      // Import progress calculation from utils
      const progress = await progressUtils.getProgress(userId);
      return progress;
    } catch (error) {
      console.error("Error calculating progress:", error);
      return 0;
    }
  };

  const getLevel = (xp) => {
    //Implementation for determining level based on XP points
    if (xp >= 1000) return "Advanced";
    if (xp >= 500) return "Intermediate";
    return "Beginner";
  };


  useEffect(() => {
    let isMounted = true;
    let profileSubscription;
    let dashboardChannel;
    let achievementsSubscription;

    const fetchUserData = async () => {
      if (!user || !isMounted) return;

      try {
        console.log("Fetching user data for dashboard...");

        // Get initial profile data including streak and achievements
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('streak_count, xp_points, progress_percentage')
          .eq('id', user.id)
          .single();

        // Fetch achievement points in parallel
        const { data: achievementsData } = await supabase
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', user.id);

        console.log("Profile data fetch result:", error ? `Error: ${error.message}` : "Success");

        // Calculate achievement points
        let achievementPoints = 0;
        if (achievementsData && achievementsData.length > 0) {
          // Get points from unlocked achievements
          const unlocked = achievementsData.map(a => a.achievement_id);
          achievementPoints = ACHIEVEMENTS
            .filter(a => unlocked.includes(a.id))
            .reduce((sum, a) => sum + a.points, 0);
        }

        // If profile doesn't exist yet, create it
        if (error && error.code === 'PGRST116') {
          console.log("Profile not found, creating one for user:", user.id);
          // Create a new profile for the user
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name,
              avatar_url: user.user_metadata?.avatar_url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              onboarding_completed: false,
              streak_count: 0,
              xp_points: 0,
              progress_percentage: 0
            });

          if (createError) {
            console.error("Error creating new profile:", createError);
          }

          // Use default values
          if (isMounted) {
            setUserStats({
              streak: 0,
              xp: 0,
              progress: 0,
              level: 'Beginner',
              achievementPoints: 0,
              totalXP: 0
            });
          }
          return;
        }

        if (error) {
          console.error("Profile data fetch error:", error);
          // Don't throw, just use defaults
          if (isMounted) {
            setUserStats({
              streak: 0,
              xp: 0,
              progress: 0,
              level: 'Beginner',
              achievementPoints: 0,
              totalXP: 0
            });
          }
          return;
        }

        if (profileData && isMounted) {
          console.log("Setting user stats with profile data");
          const xpPoints = profileData.xp_points || 0;
          const totalXP = xpPoints + achievementPoints;

          setUserStats({
            streak: profileData.streak_count ?? 0, 
            xp: xpPoints,
            progress: profileData.progress_percentage || 0,
            level: getLevel(totalXP),
            achievementPoints: achievementPoints,
            totalXP: totalXP
          });
        } else if (isMounted) {
          console.log("No profile data found, using defaults");
          setUserStats({
            streak: 0,
            xp: 0,
            progress: 0,
            level: 'Beginner',
            achievementPoints: 0,
            totalXP: 0
          });
        }

        // Set up realtime subscription for profile updates
        profileSubscription = supabase
          .channel(`profile_updates_${user.id}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          }, (payload) => {
            if (payload.new && isMounted) {
              const newXp = payload.new.xp_points ?? 0;
              setUserStats(prev => ({
                ...prev,
                streak: payload.new.streak_count ?? 0,
                xp: newXp,
                totalXP: newXp + prev.achievementPoints,
                progress: payload.new.progress_percentage ?? 0,
                level: getLevel(newXp + prev.achievementPoints)
              }));
            }
          })
          .subscribe();

        // Subscribe to achievements updates
        achievementsSubscription = supabase
          .channel(`user_achievements_${user.id}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'user_achievements',
            filter: `user_id=eq.${user.id}`
          }, async () => {
            // Refetch achievement points when new achievements are unlocked
            const { data: newAchievementsData } = await supabase
              .from('user_achievements')
              .select('achievement_id')
              .eq('user_id', user.id);

            if (newAchievementsData && isMounted) {
              const unlocked = newAchievementsData.map(a => a.achievement_id);
              const newAchievementPoints = ACHIEVEMENTS
                .filter(a => unlocked.includes(a.id))
                .reduce((sum, a) => sum + a.points, 0);

              setUserStats(prev => ({
                ...prev,
                achievementPoints: newAchievementPoints,
                totalXP: prev.xp + newAchievementPoints,
                level: getLevel(prev.xp + newAchievementPoints)
              }));
            }
          })
          .subscribe();

        // Get active conversations count
        const { count: conversationsCount } = await supabase
          .from('conversation_participants')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id);

        if (isMounted) {
          setStats(prev => ({
            ...prev,
            conversations: conversationsCount || 0
          }));
        }


      } catch (error) {
        console.error('Error in fetchUserData:', error);
      }
    };

    fetchUserData();

    // Subscribe to realtime updates for profiles
    dashboardChannel = supabase
      .channel('dashboard_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
      }, () => {
        if (isMounted && user) {
          console.log("Received profile change, updating stats for user:", user.id);
          fetchUserData(); // It's safer to refetch all data
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      if (profileSubscription) profileSubscription.unsubscribe();
      if (dashboardChannel) dashboardChannel.unsubscribe();
      if (achievementsSubscription) achievementsSubscription.unsubscribe();
    };
  }, [user?.id]); // Only re-run when user ID changes

  useEffect(() => {
    if (user?.id) {
      // Check achievements when dashboard loads
      checkAllAchievements(user.id);
      
      // Log XP details for debugging
      console.log('Dashboard XP breakdown:', {
        baseXP: userStats.xp,
        achievementPoints: userStats.achievementPoints,
        totalXP: userStats.totalXP
      });
    }
  }, [user?.id, userStats]);

  return (
    <div className="mobile-container pb-8 animate-fade-up"> {/* Added mobile-container class */}
      <div className="relative space-y-2 mb-8 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-background"> {/* Reduced p-8 to p-4 */}
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] rounded-xl" />
        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60"> {/* Reduced text-4xl to text-3xl */}
          Welcome Back!
        </h1>
        <p className="text-muted-foreground text-base"> {/* Reduced text-lg to text-base */}
          Track your progress and connect with language partners
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8"> {/* This grid needs adjustments for better responsiveness */}
        <Card className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-gradient-to-br from-card to-card/95">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">
              Streak
            </CardTitle>
            <Flame className="h-4 w-4 text-primary animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.streak} days</div>
            <div className="inline-flex items-center mt-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1" />
              Keep it going!
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-gradient-to-br from-card to-card/95">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">
              Progress
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold">{userStats.progress}%</div>
              <Badge variant="outline" className="capitalize">
                {userStats.level}
              </Badge>
            </div>
            <Progress value={userStats.progress} className="h-2 bg-primary/20" />
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-gradient-to-br from-card to-card/95">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">
              Chats
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversations}</div>
            <div className="inline-flex items-center mt-2 text-xs text-muted-foreground">
              <Target className="h-3 w-3 mr-1" />
              Active conversations
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] bg-gradient-to-br from-card to-card/95">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">
              XP Points
            </CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.totalXP || userStats.xp || 0} XP</div>
            <div className="inline-flex items-center mt-2 text-xs text-muted-foreground">
              <Book className="h-3 w-3 mr-1" />
              Learning rewards
            </div>
          </CardContent>
        </Card>
      </div>



      <div className="mt-8 space-y-8">
        <AchievementsList />
        <AchievementStats />
      </div>
    </div>
  );
};

export default Dashboard;