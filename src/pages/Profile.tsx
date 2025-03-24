import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Calendar, 
  Flame, 
  Heart, 
  Languages, 
  MapPin, 
  MessageCircle, 
  Share2, 
  User 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  username: string;
  bio: string;
  avatar_url: string;
  native_language: string;
  learning_language: string;
  proficiency_level: string;
  streak_count: number;
  likes_count: number;
  created_at: string;
  achievements: {
    title: string;
    description: string;
    date: string;
    icon: string;
  }[];
}

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        // For now, we'll hardcode achievements since they're not in DB yet
        const profileData = {
          ...data,
          achievements: [
            {
              title: "Week One Warrior",
              description: "Completed 7 consecutive days of language learning",
              date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              icon: "🔥"
            },
            {
              title: "Conversation Starter",
              description: "Initiated first language exchange conversation",
              date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
              icon: "💬"
            }
          ]
        };

        setProfile(profileData);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load profile data",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleLike = async () => {
    if (!profile || !user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          likes_count: profile.likes_count + 1 
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        likes_count: profile.likes_count + 1
      });

      toast({
        title: "Profile liked",
        description: "Thanks for the support!",
      });
    } catch (error) {
      console.error('Error updating likes:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update likes",
      });
    }
  };

  const calculateJoinedTime = (dateString: string) => {
    const joinDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - joinDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else {
      const diffMonths = Math.floor(diffDays / 30);
      return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied",
      description: "Profile link copied to clipboard",
    });
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
        <h2 className="text-2xl font-bold mb-2">Profile not found</h2>
        <p className="text-muted-foreground mb-6">
          We couldn't find your profile information.
        </p>
        <Button asChild>
          <Link to="/community">Back to Community</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container pb-12 animate-fade-in">
      {/* Profile Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center space-x-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                <Avatar className="h-24 w-24 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                  <AvatarImage src={profile.avatar_url || "/placeholder.svg"} alt={profile.username} />
                  <AvatarFallback className="text-2xl">{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{profile.username}</DialogTitle>
                <DialogDescription>Profile picture</DialogDescription>
              </DialogHeader>
              <div className="flex justify-center p-4">
                <img 
                  src={profile.avatar_url || "/placeholder.svg"}
                  alt={profile.username} 
                  className="max-w-full max-h-[60vh] object-contain rounded-md"
                />
              </div>
            </DialogContent>
          </Dialog>

          <div>
            <h1 className="text-3xl font-bold">{profile.username}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Joined {calculateJoinedTime(profile.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button 
            variant="outline"
            size="sm" 
            className="button-hover"
            onClick={handleLike}
          >
            <Heart className="h-4 w-4 mr-2" />
            {profile.likes_count}
          </Button>

          <Button variant="outline" size="sm" className="button-hover" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Language Info */}
      <Card className="mb-8 glass-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-semibold">Language Skills</h3>
              <div className="flex flex-col space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Native language:</span>
                  <Badge variant="secondary">{profile.native_language}</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Languages className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Learning:</span>
                  <Badge>{profile.learning_language}</Badge>
                  <span className="text-xs text-muted-foreground">({profile.proficiency_level})</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-center">
                <div className="flex items-center space-x-1">
                  <Flame className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{profile.streak_count}</span>
                </div>
                <span className="text-xs text-muted-foreground">day streak</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Tabs defaultValue="about" className="mb-8">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>About {profile.username}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{profile.bio}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profile.achievements.map((achievement, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 rounded-lg border border-border">
                    <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full text-xl">
                      {achievement.icon}
                    </div>
                    <div>
                      <h4 className="font-medium">{achievement.title}</h4>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Achieved on {new Date(achievement.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;