
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  Calendar, 
  Flame, 
  Languages, 
  MapPin, 
  MessageCircle, 
  User,
  Award,
  BookOpen,
  Heart,
  Sparkles,
  GraduationCap,
  FileText,
  Mail,
  ArrowLeft,
  ArrowRight,
  X
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
  DialogTrigger,
  DialogClose
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
  const navigate = useNavigate();

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

  

  const handleStartChat = async (userId) => {
    try {
      if (!user) return;

      // First check if a conversation already exists between the users
      const { data: existingConversations, error: convError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(id)
        `)
        .eq('user_id', user.id);

      if (convError) throw convError;

      // Get all conversations where both users are participants
      const conversationIds = existingConversations.map(c => c.conversation_id);
      
      if (conversationIds.length > 0) {
        const { data: sharedConversations, error: sharedError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .in('conversation_id', conversationIds)
          .eq('user_id', userId)
          .limit(1);

        if (sharedError) throw sharedError;

        if (sharedConversations && sharedConversations.length > 0) {
          // Conversation exists, navigate to it
          navigate(`/chat/${sharedConversations[0].conversation_id}`);
          return;
        }
      }
      
      // Create new conversation if none exists
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert([{ created_by: user.id }])
        .select()
        .single();

      if (createError) throw createError;

      // Add participants to the conversation
      const { error: participantsInsertError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConversation.id, user_id: user.id },
          { conversation_id: newConversation.id, user_id: userId }
        ]);

      if (participantsInsertError) throw participantsInsertError;

      navigate(`/chat/${newConversation.id}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to start chat',
        variant: 'destructive',
      });
    }
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
    <div className="container pb-12 pt-6 animate-fade-in max-w-7xl mx-auto px-2 sm:px-4">
      {/* Back Button */}
      <div className="w-full flex items-center mb-6">
        <Button variant="ghost" size="sm" asChild className="group flex items-center gap-2 hover:bg-primary/10">
          <Link to="/community">
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
            <span>Back to Community</span>
          </Link>
        </Button>
      </div>

      {/* Profile Card with Avatar, Name and Actions */}
      <Card className="p-6 mb-8 border-0 shadow-md bg-gradient-to-r from-background to-muted/20">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
          {/* Avatar Section */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent relative group">
                <div className="h-32 w-32 rounded-full ring-4 ring-primary/10 shadow-xl cursor-pointer hover:ring-primary/30 transition-all overflow-hidden group-hover:brightness-90">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.full_name} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-muted flex items-center justify-center">
                      <span className="text-3xl">{profile.full_name?.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <span className="text-xs font-medium">View full size</span>
                  </div>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0 overflow-hidden">
              <DialogHeader className="sr-only">
                <DialogTitle>{profile.full_name}'s Profile Picture</DialogTitle>
                <DialogDescription>Full size view of profile picture</DialogDescription>
              </DialogHeader>
              <div className="relative w-full">
                <div className="w-full flex items-center justify-center bg-black/5 p-6">
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.full_name} 
                    className="max-w-full max-h-[75vh] object-contain rounded-md"
                  />
                </div>
                
                <div className="p-4 bg-background">
                  <h3 className="text-lg font-semibold">{profile.full_name}</h3>
                  <p className="text-sm text-muted-foreground">Profile picture</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Profile Info and Action Buttons */}
          <div className="flex-1 flex flex-col items-center md:items-start">
            <h1 className="text-3xl font-bold mb-2">{profile.full_name}</h1>
            
            {profile.date_of_birth && (
              <div className="mb-3">
                <Badge variant="outline" className="px-2 py-1">
                  {getAgeFromDateOfBirth(profile.date_of_birth)} years old
                </Badge>
              </div>
            )}
            
            {/* About Section Directly Integrated */}
            {profile.bio && (
              <p className="text-muted-foreground text-sm mb-4 text-center md:text-left max-w-md">
                {profile.bio}
              </p>
            )}
            
            {/* Joined Date */}
            <div className="flex items-center mb-4 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              Joined {calculateJoinDate(profile.created_at)}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-2">
              {!isCurrentUser && (
                <>
                  <LikeButton
                    targetUserId={profile.id}
                    currentUserId={user?.id}
                    className="button-hover"
                  />
                  
                  <Button 
                    size="sm" 
                    className="button-hover"
                    onClick={() => handleStartChat(profile.id)}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
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
      </Card>

      {/* Profile Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Left Column - Personal Info */}
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-md font-semibold">Learning Goals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-3">
                <div className="inline-flex items-center">
                  <GraduationCap className="h-4 w-4 text-primary mr-2" />
                  <h3 className="text-sm font-medium">Goal</h3>
                </div>
                <p className="text-sm pl-6">{profile.learning_goal || "No learning goal set"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-md font-semibold">Language Skills</CardTitle>
              <div className="flex items-center justify-center mt-2">
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  {profile.proficiency_level?.charAt(0).toUpperCase() + profile.proficiency_level?.slice(1) || "Beginner"} Level
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-3">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="px-3 py-1.5">
                    {getLanguageFlag(profile.native_language)}
                    <span className="ml-2">{profile.native_language || "Not specified"}</span>
                  </Badge>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="px-3 py-1.5">
                    {getLanguageFlag(profile.learning_language)}
                    <span className="ml-2">{profile.learning_language || "Not specified"}</span>
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
    </div>
  );
};

export default Profile;
