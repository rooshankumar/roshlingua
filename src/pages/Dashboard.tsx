import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { NotificationCard } from "@/components/notifications/NotificationCard";
import { AchievementStats } from "@/components/AchievementStats";
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

// Achievement types
export type Achievement = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  isCompleted: boolean;
};

// Achievement hook
const useAchievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    // Fetch achievements from Supabase or other data source
    const fetchAchievements = async () => {
      try {
        // Replace with your actual achievement fetching logic
        const fetchedAchievements: Achievement[] = [
          { id: '1', title: 'First Conversation', description: 'Had your first conversation!', isCompleted: true },
          { id: '2', title: '10 Conversations', description: 'Had 10 conversations!', isCompleted: false },
          { id: '3', title: '50 XP', description: 'Earned 50 XP points!', isCompleted: true },
          // Add more achievements here
        ];
        setAchievements(fetchedAchievements);
      } catch (error) {
        console.error('Error fetching achievements:', error);
      }
    };

    fetchAchievements();
  }, []);

  return achievements;
};


// AchievementsList component
const AchievementsList = () => {
  const achievements = useAchievements();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {achievements.map((achievement) => (
        <Card key={achievement.id} className="bg-gradient-to-br from-card to-card/95 hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <CardTitle>{achievement.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{achievement.description}</p>
            {achievement.imageUrl && <img src={achievement.imageUrl} alt={achievement.title} />}
            <Badge variant={achievement.isCompleted ? 'default' : 'outline'}>
              {achievement.isCompleted ? 'Completed' : 'In Progress'}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

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


  useEffect(() => {
    let isMounted = true;
    let profileSubscription;
    let dashboardChannel;

    const fetchUserData = async () => {
      if (!user || !isMounted) return;

      try {
        console.log("Fetching user data for dashboard...");
        // Get initial profile data including streak
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('streak_count, xp_points, progress_percentage')
          .eq('id', user.id)
          .single();

        console.log("Profile data fetch result:", error ? `Error: ${error.message}` : "Success");

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
              level: 'Beginner'
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
              level: 'Beginner'
            });
          }
          return;
        }

        if (profileData && isMounted) {
          console.log("Setting user stats with profile data");
          setUserStats({
            streak: profileData.streak_count ?? 0, 
            xp: profileData.xp_points || 0,
            progress: profileData.progress_percentage || 0,
            level: getLevel(profileData.xp_points || 0)
          });
        } else if (isMounted) {
          console.log("No profile data found, using defaults");
          setUserStats({
            streak: 0,
            xp: 0,
            progress: 0,
            level: 'Beginner'
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

        if (isMounted) {
          setStats(prev => ({
            ...prev,
            conversations: conversationsCount || 0
          }));
        }

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

        if (isMounted) {
          setActiveUsers(activeUsersData || []);
        }
      } catch (error) {
        console.error('Error in fetchUserData:', error);
      }
    };

    fetchUserData();

    // Subscribe to realtime updates
    dashboardChannel = supabase
      .channel('dashboard_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
      }, () => {
        // Don't call fetchUserData directly to avoid loops
        if (isMounted && user) {
          console.log("Received profile change, updating stats for user:", user.id);
          // Instead of calling fetchUserData, update specific data
          supabase
            .from('profiles')
            .select('streak_count, xp_points, progress_percentage')
            .eq('id', user.id)
            .single()
            .then(({ data, error }) => {
              if (!error && data && isMounted) {
                setUserStats({
                  streak: data.streak_count ?? 0,
                  xp: data.xp_points || 0,
                  progress: data.progress_percentage || 0,
                  level: getLevel(data.xp_points || 0)
                });
              }
            });
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      if (profileSubscription) profileSubscription.unsubscribe();
      if (dashboardChannel) dashboardChannel.unsubscribe();
    };
  }, [user?.id]); // Only re-run when user ID changes

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

      <Card className="overflow-hidden bg-gradient-to-br from-card to-card/95 hover:shadow-lg transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-muted/50">
          <div className="space-y-1">
            <CardTitle>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Active Community</span>
              </div>
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              Connect with language partners 
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"/>
                online now
              </span>
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground">
            <Link to="/community">View All</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {activeUsers.map((user) => (
              <Link to={`/profile/${user.id}`} key={user.id} className="group">
                <div className="flex flex-col items-center p-4 rounded-xl border border-border bg-gradient-to-b from-muted/50 to-transparent backdrop-blur-sm group-hover:border-primary/50 group-hover:shadow-lg transition-all duration-200">
                  <div className="relative mb-3">
                    <Avatar className="h-16 w-16 ring-2 ring-border group-hover:ring-primary/50 transition-all">
                      <AvatarImage src={user.avatar_url} alt={user.full_name} />
                      <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute bottom-0 right-0 w-4 h-4 rounded-full ring-2 ring-background transition-colors",
                      user.is_online ? "bg-green-500" : "bg-gray-400"
                    )}></div>
                  </div>
                  <h4 className="font-medium text-sm group-hover:text-primary transition-colors">{user.full_name}</h4>
                  <div className="flex items-center space-x-1 mt-2">
                    <Languages className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{user.learning_language}</span>
                  </div>
                  <div className="flex items-center space-x-1 mt-1">
                    <Flame className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">{user.streak_count || 0} day streak</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 space-y-8">
        <AchievementsList />
        <AchievementStats />
      </div>

      <NotificationCard />
    </div>
  );
};

export default Dashboard;