import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { NotificationCard } from "@/components/notifications/NotificationCard";
import { 
  Activity, Award, Calendar, Flame, 
  Languages, MessageSquare, Users,
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
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const { user } = useAuth();
  const { onlineUsers } = useUserPresence();
  const [userStats, setUserStats] = useState({
    streak: 0,
    xp: 0,
    progress: 0,
    level: 'Beginner'
  });
  const [activeUsers, setActiveUsers] = useState([]);
  const [stats, setStats] = useState({
    conversations: 0,
    xp: 0,
    proficiency_level: 'beginner'
  });

  const getXP = async (userId) => {
    //Implementation for fetching XP from Supabase based on userId
    try{
        const { data, error } = await supabase
          .from('profiles')
          .select('xp_points')
          .eq('id', userId)
          .single();
        if (error) throw error;
        return data.xp_points || 0;
    } catch (error) {
        console.error("Error fetching XP:", error);
        return 0;
    }
  };

  const getProgress = async (userId) => {
    //Implementation for fetching progress from Supabase based on userId
    try{
        const { data, error } = await supabase
          .from('profiles')
          .select('progress_percentage')
          .eq('id', userId)
          .single();
        if (error) throw error;
        return data.progress_percentage || 0;
    } catch (error) {
        console.error("Error fetching progress:", error);
        return 0;
    }
  };

  const getLevel = (xp) => {
    //Implementation for determining level based on XP points
    if (xp >= 1000) return "Advanced";
    if (xp >= 500) return "Intermediate";
    return "Beginner";
  };

  const updateUserActivity = async (userId) => {
    //Implementation to update user activity in Supabase
    try {
      await supabase
        .from('profiles')
        .update({ last_active: new Date() })
        .eq('id', userId);
    } catch (error) {
      console.error("Error updating user activity:", error);
    }
  };


  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // Get initial profile data including streak
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('streak_count, xp_points, progress_percentage')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (profileData) {
          setUserStats({
            streak: profileData.streak_count ?? 0, // Use nullish coalescing to only default to 0 if null/undefined
            xp: profileData.xp_points || 0,
            progress: profileData.progress_percentage || 0,
            level: getLevel(profileData.xp_points || 0)
          });
        }

        // Set up realtime subscription for profile updates
        const profileSubscription = supabase
          .channel(`profile_updates_${user.id}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          }, (payload) => {
            if (payload.new) {
              setUserStats(prev => ({
                ...prev,
                streak: payload.new.streak_count ?? 0,
                xp: payload.new.xp_points ?? 0,
                progress: payload.new.progress_percentage ?? 0,
                level: getLevel(payload.new.xp_points ?? 0)
              }));
            }
          })
          .subscribe();

        // Get active conversations count
        const { count: conversationsCount } = await supabase
          .from('conversation_participants')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id);

        // Update user activity to trigger streak calculation
        await updateUserActivity(user.id);

        return () => {
          profileSubscription.unsubscribe();
        };

        setStats({
          conversations: conversationsCount || 0,
          xp: xpData || 0,
          proficiency_level: getLevel(xpData) || 'beginner'
        });

        // Get active users
        const { data: activeUsersData } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            avatar_url,
            native_language,
            learning_language,
            streak_count,
            last_seen
          `)
          .neq('id', user.id)
          .order('last_seen', { ascending: false })
          .limit(4);

        setActiveUsers(activeUsersData || []);
      } catch (error) {
        console.error('Error in fetchUserData:', error);
      }
    };

    fetchUserData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('dashboard_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
      }, () => {
        fetchUserData();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  return (
    <div className="container pb-8 animate-fade-up">
      <div className="relative space-y-2 mb-8 p-8 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-background">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] rounded-xl" />
        <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
          Welcome Back!
        </h1>
        <p className="text-muted-foreground text-lg">
          Track your progress and connect with language partners
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
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
            <div className="text-2xl font-bold">{userStats.xp} XP</div>
            <div className="inline-flex items-center mt-2 text-xs text-muted-foreground">
              <Book className="h-3 w-3 mr-1" />
              Learning rewards
            </div>
          </CardContent>
        </Card>
      </div>



      <NotificationCard />
    </div>
  );
};

export default Dashboard;