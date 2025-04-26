
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Calendar, 
  Flame, 
  Languages, 
  MapPin, 
  MessageCircle, 
  Share2, 
  User,
  Award,
  BookOpen,
  Heart,
  Sparkles,
  GraduationCap,
  FileText,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { LikeButton } from "@/components/LikeButton";
import { useProfile } from "@/hooks/useProfile";
import { ACHIEVEMENTS } from "@/hooks/useAchievements";

const Profile = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, loading, error } = useProfile(id || '');
  const [userAchievements, setUserAchievements] = useState([]);
  const [totalXp, setTotalXp] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  useEffect(() => {
    setIsCurrentUser(user?.id === id);
  }, [user, id]);

  useEffect(() => {
    if (id) {
      fetchUserAchievements();
    }
  }, [id]);

  const fetchUserAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', id);

      if (error) throw error;
      
      // Map DB achievements to full achievement data from constant
      const enrichedAchievements = data?.map(ua => {
        const achievementDetails = ACHIEVEMENTS.find(a => a.id === ua.achievement_id);
        return {
          ...ua,
          ...achievementDetails,
          unlocked_at: new Date(ua.unlocked_at).toLocaleDateString()
        };
      }) || [];
      
      setUserAchievements(enrichedAchievements);
      
    } catch (err) {
      console.error("Error fetching achievements:", err);
    }
  };

  useEffect(() => {
    if (profile?.xp_points) {
      setTotalXp(profile.xp_points);
    }
  }, [profile]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied to clipboard",
      description: "You can now share this profile with others",
    });
  };

  const calculateJoinDate = (dateString: string) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const getAgeFromDateOfBirth = (dateString: string) => {
    if (!dateString) return null;
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateLevel = (xp: number) => {
    if (xp >= 1000) return { name: "Master", progress: 100 };
    if (xp >= 750) return { name: "Advanced", progress: 75 };
    if (xp >= 500) return { name: "Intermediate", progress: 50 };
    if (xp >= 250) return { name: "Beginner Plus", progress: 25 };
    return { name: "Beginner", progress: 10 };
  };

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spinner"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container py-12 text-center">
        <h2 className="text-2xl font-bold mb-2">User not found</h2>
        <p className="text-muted-foreground mb-6">
          The profile you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link to="/community">Back to Community</Link>
        </Button>
      </div>
    );
  }

  const userLevel = calculateLevel(totalXp);

  return (
    <div className="container pb-12 animate-fade-in max-w-5xl mx-auto">
      {/* Profile Header */}
      <div className="relative mb-8 overflow-hidden rounded-xl">
        <div className="h-48 bg-gradient-to-r from-primary/20 to-primary/5"></div>
        <div className="absolute -bottom-16 left-8">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                <Avatar className="h-32 w-32 ring-4 ring-background shadow-md cursor-pointer hover:ring-primary/50 transition-all">
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                  <AvatarFallback className="text-3xl">{profile.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{profile.full_name}</DialogTitle>
                <DialogDescription>Profile picture</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 p-4">
                <img 
                  src={profile.avatar_url} 
                  alt={profile.full_name} 
                  className="max-w-full max-h-[60vh] object-contain rounded-md"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex justify-end p-4">
          <div className="flex space-x-2">
            {!isCurrentUser && (
              <>
                <LikeButton
                  targetUserId={profile.id}
                  currentUserId={user?.id}
                  className="button-hover"
                />

                <Button variant="outline" size="sm" className="button-hover" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>

                <Button asChild size="sm" className="button-hover">
                  <Link to={`/chat/${profile.id}`}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Link>
                </Button>
              </>
            )}
            {isCurrentUser && (
              <Button asChild size="sm" className="button-hover">
                <Link to="/settings">
                  <FileText className="h-4 w-4 mr-2" />
                  Edit Profile
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-20">
        {/* Left Column - Personal Info */}
        <div className="space-y-6">
          <Card className="glass-card overflow-visible">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">{profile.full_name}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge variant="secondary" className="px-2 py-1">
                  @{profile.username || "username"}
                </Badge>
                {profile.date_of_birth && (
                  <Badge variant="outline" className="px-2 py-1">
                    {getAgeFromDateOfBirth(profile.date_of_birth)} years old
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Joined {calculateJoinDate(profile.created_at)}
                </span>
              </div>
              {profile.bio && (
                <div className="pt-2 border-t border-border">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">About</h3>
                  <p className="text-sm">{profile.bio}</p>
                </div>
              )}
              <div className="pt-2 border-t border-border">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Learning Goal</h3>
                <p className="text-sm">{profile.learning_goal || "No learning goal set"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-md font-semibold">Language Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Native language:</span>
                </div>
                <Badge variant="secondary">{profile.native_language || "Not specified"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Languages className="h-4 w-4 text-primary" />
                  <span className="text-sm">Learning:</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge>{profile.learning_language || "Not specified"}</Badge>
                  <Badge variant="outline" className="bg-muted">
                    {profile.proficiency_level || "beginner"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-md font-semibold">Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Streak:</span>
                </div>
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600">
                  {profile.streak_count || 0} days
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Likes received:</span>
                </div>
                <Badge variant="outline" className="bg-red-500/10 text-red-600">
                  {profile.likes_count || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="text-sm">Achievements:</span>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  {userAchievements.length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Achievements & Progress */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle>Level & XP</CardTitle>
                <Badge className="text-sm py-1">
                  {userLevel.name} Level
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-muted-foreground">Progress to next level</span>
                  <span className="font-medium">{totalXp} XP</span>
                </div>
                <Progress value={userLevel.progress} className="h-2" />
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                  <div className="flex flex-col items-center bg-muted/50 p-3 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Vocabulary</span>
                    <span className="text-xs text-muted-foreground">Coming Soon</span>
                  </div>
                  
                  <div className="flex flex-col items-center bg-muted/50 p-3 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Grammar</span>
                    <span className="text-xs text-muted-foreground">Coming Soon</span>
                  </div>
                  
                  <div className="flex flex-col items-center bg-muted/50 p-3 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                      <MessageCircle className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Speaking</span>
                    <span className="text-xs text-muted-foreground">Coming Soon</span>
                  </div>
                  
                  <div className="flex flex-col items-center bg-muted/50 p-3 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Listening</span>
                    <span className="text-xs text-muted-foreground">Coming Soon</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="achievements">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="achievements" className="space-y-4">
              {userAchievements.length > 0 ? (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {userAchievements.map((achievement) => (
                    <Card key={achievement.id} className="overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-1">
                      <CardContent className="p-0">
                        <div className="flex items-start space-x-3 p-4">
                          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full text-xl">
                            {achievement.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{achievement.title}</h4>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                Achieved on {achievement.unlocked_at}
                              </span>
                              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                +{achievement.points} XP
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-muted/20">
                  <CardContent className="flex flex-col items-center justify-center text-center p-8">
                    <div className="w-12 h-12 rounded-full bg-muted/80 flex items-center justify-center mb-4">
                      <Award className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No achievements yet</h3>
                    <p className="text-muted-foreground max-w-md">
                      This user hasn't unlocked any achievements yet. Achievements are earned by using the app and completing various activities.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="activity">
              <Card className="bg-muted/20">
                <CardContent className="flex flex-col items-center justify-center text-center p-8">
                  <div className="w-12 h-12 rounded-full bg-muted/80 flex items-center justify-center mb-4">
                    <Sparkles className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Activity tracking coming soon</h3>
                  <p className="text-muted-foreground max-w-md">
                    We're working on a feature to show each user's recent activity and learning progress.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="flex justify-center space-x-4 mt-8">
        <Button asChild variant="outline" className="button-hover">
          <Link to="/community">
            Back to Community
          </Link>
        </Button>
        {!isCurrentUser && (
          <Button asChild className="button-hover">
            <Link to={`/chat/${profile.id}`}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Start Conversation
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default Profile;
