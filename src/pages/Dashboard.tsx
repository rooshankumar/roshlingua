import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Activity,
  Award, 
  Calendar, 
  Flame, 
  Languages, 
  MessageSquare, 
  Users 
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeUsers, setActiveUsers] = useState([]);
  const [stats, setStats] = useState({
    conversations: 0,
    xp: 0
  });

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      // Get user profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('streak_count, proficiency_level, xp_points')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setStreak(profileData.streak_count || 0);
        // Calculate progress based on proficiency level
        const levels = ['beginner', 'intermediate', 'advanced'];
        const currentLevel = levels.indexOf(profileData.proficiency_level);
        setProgress((currentLevel + 1) * 33);
      }

      // Get active conversations count
      const { count: conversationsCount } = await supabase
        .from('conversations')
        .select('id', { count: 'exact' })
        .eq('participant1_id', user.id)
        .or(`participant2_id.eq.${user.id}`);

      setStats({
        conversations: conversationsCount || 0,
        xp: profileData?.xp_points || 0
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
    <div className="container animate-fade-in">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your language learning journey.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Streak
            </CardTitle>
            <Flame className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streak} days</div>
            <p className="text-xs text-muted-foreground">
              Keep practicing to maintain your streak!
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Learning Progress
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-1">
              <div className="text-2xl font-bold">{progress}%</div>
              <div className="text-xs text-muted-foreground">
                {progress <= 33 ? 'Beginner' : progress <= 66 ? 'Intermediate' : 'Advanced'}
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversations
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversations}</div>
            <p className="text-xs text-muted-foreground">
              Active conversations with language partners
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Achievement Points
            </CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.xp} XP</div>
            <p className="text-xs text-muted-foreground">
              Earned from activities and conversations
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Active Community Members</span>
                </div>
              </CardTitle>
              <CardDescription>
                Connect with language partners who are online now
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/community">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {activeUsers.map((user) => (
                <Link to={`/profile/${user.id}`} key={user.id}>
                  <div className="flex flex-col items-center p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center">
                    <div className="relative">
                      <Avatar className="h-16 w-16 mb-2">
                        <AvatarImage src={user.avatar_url} alt={user.full_name} />
                        <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-2 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                    </div>
                    <h4 className="font-medium text-sm">{user.full_name}</h4>
                    <div className="flex items-center space-x-1 mt-1">
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
      </div>
      {/* Daily Goal and Streak Calendar -  Removed for brevity as it's not directly impacted by the data change. */}
      {/* Language Learning Tips - Removed for brevity as it's not directly impacted by the data change. */}
    </div>
  );
};

export default Dashboard;