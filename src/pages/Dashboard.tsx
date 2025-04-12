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
  const [streak, setStreak] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeUsers, setActiveUsers] = useState([]);
  const [stats, setStats] = useState({
    conversations: 0,
    xp: 0,
    proficiency_level: 'beginner'
  });

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        // Get user profile data
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select(`
            streak_count,
            proficiency_level,
            xp_points,
            progress_percentage,
            last_seen
          `) 
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile data:', error);
          return;
        }

        // Update last_seen to trigger streak calculation
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating last_seen:', updateError);
        }

        // Fetch updated profile data to get new streak count
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('streak_count, progress_percentage')
          .eq('id', user.id)
          .single();

        if (updatedProfile) {
          setStreak(updatedProfile.streak_count || 0);
          setProgress(updatedProfile.progress_percentage || 0);
        }

        // Get active conversations count
        const { count: conversationsCount } = await supabase
          .from('conversation_participants')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id);

        setStats({
          conversations: conversationsCount || 0,
          xp: profileData?.xp_points || 0,
          proficiency_level: profileData?.proficiency_level || 'beginner'
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
            <div className="text-2xl font-bold">{streak} days</div>
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
              <div className="text-2xl font-bold">{progress}%</div>
              <Badge variant="outline" className="capitalize">
                {stats.proficiency_level}
              </Badge>
            </div>
            <Progress value={progress} className="h-2 bg-primary/20" />
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
            <div className="text-2xl font-bold">{stats.xp} XP</div>
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

      <NotificationCard />
    </div>
  );
};

export default Dashboard;