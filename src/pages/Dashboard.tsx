
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
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

const Dashboard = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [progress, setProgress] = useState(0);
  const [activeUsers, setActiveUsers] = useState([]);
  const [conversations, setConversations] = useState(0);
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!user) return;

      try {
        // Get user profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('streak_count, xp_points, proficiency_level')
          .eq('id', user.id)
          .single();

        if (profile) {
          setStreak(profile.streak_count || 0);
          setXp(profile.xp_points || 0);
          setProgress(profile.proficiency_level || 0);
        }

        // Get active conversations count
        const { count } = await supabase
          .from('conversation_participants')
          .select('conversation_id', { count: 'exact' })
          .eq('user_id', user.id);

        setConversations(count || 0);
      } catch (error) {
        console.error('Error fetching user stats:', error);
      }
    };

    const fetchActiveUsers = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select(`
            id,
            username,
            avatar_url,
            native_language,
            learning_language,
            streak_count,
            is_online
          `)
          .eq('is_online', true)
          .limit(4);

        setActiveUsers(data?.map(user => ({
          id: user.id,
          name: user.username,
          language: user.learning_language,
          streak: user.streak_count,
          avatar: user.avatar_url || '/placeholder.svg',
          online: user.is_online
        })) || []);
      } catch (error) {
        console.error('Error fetching active users:', error);
      } finally {
        setLoading(false);
      }
    };

    // Set up real-time subscription
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles',
          filter: `id=eq.${user?.id}`
        }, 
        () => {
          fetchUserStats();
        })
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'is_online=eq.true'
        },
        () => {
          fetchActiveUsers();
        })
      .subscribe();

    fetchUserStats();
    fetchActiveUsers();

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
      
      {/* Streak and Progress Summary */}
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
              Keep it up! Your best streak is {streak} days.
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
              <div className="text-xs text-muted-foreground">Level {Math.floor(progress/20) + 1}</div>
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
            <div className="text-2xl font-bold">{conversations}</div>
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
            <div className="text-2xl font-bold">{xp} XP</div>
            <p className="text-xs text-muted-foreground">
              Earned from streaks and conversations
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Daily Goal and Streak Calendar */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Daily Goals</CardTitle>
            <CardDescription>
              Track your daily language learning goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <div>
                    <p className="font-medium">Conversation Practice</p>
                    <p className="text-xs text-muted-foreground">
                      Chat with at least one language partner
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {conversations > 0 ? 'Completed' : 'Pending'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                  <div>
                    <p className="font-medium">Vocabulary Review</p>
                    <p className="text-xs text-muted-foreground">
                      Practice 10 new words today
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-muted-foreground">
                  Pending
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <div>
                    <p className="font-medium">Grammar Exercise</p>
                    <p className="text-xs text-muted-foreground">
                      Complete one grammar lesson
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Completed
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Streak Calendar</CardTitle>
              <CardDescription>
                Your language learning activity
              </CardDescription>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 14 }).map((_, i) => (
                <div 
                  key={i} 
                  className={`aspect-square rounded-sm ${
                    i < streak 
                      ? 'bg-primary/70 hover:bg-primary' 
                      : 'bg-muted hover:bg-muted-foreground/20'
                  } transition-colors`}
                  title={`${i < streak ? 'Active' : 'Inactive'} - ${new Date(
                    Date.now() - (13 - i) * 24 * 60 * 60 * 1000
                  ).toLocaleDateString()}`}
                ></div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
              <span>2 weeks ago</span>
              <span>Today</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Active Community Members */}
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
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {activeUsers.map((user) => (
                  <Link to={`/profile/${user.id}`} key={user.id}>
                    <div className="flex flex-col items-center p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center">
                      <div className="relative">
                        <Avatar className="h-16 w-16 mb-2">
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-2 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                      </div>
                      <h4 className="font-medium text-sm">{user.name}</h4>
                      <div className="flex items-center space-x-1 mt-1">
                        <Languages className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{user.language}</span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <Flame className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium">{user.streak} day streak</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Language Learning Tips */}
      <Card className="glass-card mb-8">
        <CardHeader>
          <CardTitle>Daily Language Tip</CardTitle>
          <CardDescription>
            Boost your learning with these helpful tips
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <h4 className="font-medium text-lg mb-2">The Language Immersion Technique</h4>
            <p className="text-muted-foreground mb-4">
              Try to immerse yourself in your target language by changing the language settings on your phone, watching movies with subtitles, or listening to podcasts. Surrounding yourself with the language helps your brain adapt more quickly.
            </p>
            <Button variant="outline" size="sm" className="button-hover">
              Read More Tips
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
