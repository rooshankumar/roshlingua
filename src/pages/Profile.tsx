
import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { 
  Calendar, 
  Flame, 
  Heart, 
  Languages, 
  User, 
  MessageCircle, 
  Share2, 
  Edit,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { supabase, toggleProfileLike, hasUserLikedProfile } from "@/lib/supabase";

interface ProfileData {
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
  isLiked: boolean;
  achievements: {
    title: string;
    description: string;
    date: string;
    icon: string;
  }[];
}

const Profile = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedBio, setEditedBio] = useState("");
  const [editedUsername, setEditedUsername] = useState("");
  const { toast } = useToast();

  // Get profile details and handle real-time updates
  useEffect(() => {
    const profileId = id || user?.id;
    if (!profileId) return;

    const fetchProfile = async () => {
      try {
        console.log("Fetching profile for:", profileId);
        
        // First get profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, bio, avatar_url, likes_count, created_at')
          .eq('id', profileId)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          throw profileError;
        }

        // Then get user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('native_language, learning_language, proficiency_level, streak_count')
          .eq('id', profileId)
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
          throw userError;
        }

        // Check if current user has liked this profile
        let isLiked = false;
        if (user && user.id !== profileId) {
          isLiked = await hasUserLikedProfile(user.id, profileId);
        }

        // For now, we'll hardcode achievements since they're not in DB yet
        const profileData2: ProfileData = {
          id: profileData.id,
          username: profileData.username || 'User',
          bio: profileData.bio || 'No bio available',
          avatar_url: profileData.avatar_url,
          native_language: userData.native_language,
          learning_language: userData.learning_language,
          proficiency_level: userData.proficiency_level,
          streak_count: userData.streak_count || 0,
          likes_count: profileData.likes_count || 0,
          created_at: profileData.created_at,
          isLiked,
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

        setProfile(profileData2);
        setEditedBio(profileData2.bio);
        setEditedUsername(profileData2.username);
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

    // Set up real-time subscription for profile changes
    const channel = supabase
      .channel(`profile:${profileId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${profileId}`,
      }, (payload) => {
        // Update profile state based on the change
        setProfile(currentProfile => {
          if (!currentProfile) return currentProfile;
          
          return {
            ...currentProfile,
            username: payload.new.username || currentProfile.username,
            bio: payload.new.bio || currentProfile.bio,
            avatar_url: payload.new.avatar_url,
            likes_count: payload.new.likes_count || 0
          };
        });
      })
      .subscribe();

    // Set up real-time subscription for user likes changes
    if (user && profileId !== user.id) {
      const likesChannel = supabase
        .channel(`likes:${user.id}-${profileId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_likes',
          filter: `liker_id=eq.${user.id} AND liked_id=eq.${profileId}`,
        }, async () => {
          // Check if the profile is liked by the current user
          const isLiked = await hasUserLikedProfile(user.id, profileId);
          
          setProfile(currentProfile => {
            if (!currentProfile) return currentProfile;
            return {
              ...currentProfile,
              isLiked
            };
          });
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(likesChannel);
      };
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user, toast]);

  const handleLike = async () => {
    if (!profile || !user) return;
    
    if (user.id === profile.id) {
      toast({
        title: "Not allowed",
        description: "You cannot like your own profile",
      });
      return;
    }

    try {
      // Optimistic UI update
      setProfile(prev => prev ? {
        ...prev,
        isLiked: !prev.isLiked,
        likes_count: prev.isLiked ? prev.likes_count - 1 : prev.likes_count + 1
      } : null);

      // Perform the actual toggle like operation
      const success = await toggleProfileLike(user.id, profile.id);
      
      if (!success) {
        // Revert the optimistic update if operation failed
        setProfile(prev => prev ? {
          ...prev,
          isLiked: !prev.isLiked,
          likes_count: !prev.isLiked ? prev.likes_count - 1 : prev.likes_count + 1
        } : null);
        
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update like status",
        });
      }
    } catch (error) {
      console.error('Error updating likes:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update likes",
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    
    // Only allow users to edit their own profile
    if (user.id !== profile.id) {
      toast({
        variant: "destructive",
        title: "Not allowed",
        description: "You can only edit your own profile",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          username: editedUsername,
          bio: editedBio
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        username: editedUsername,
        bio: editedBio
      } : null);

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
      
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile",
      });
    }
  };

  const cancelEditing = () => {
    if (profile) {
      setEditedBio(profile.bio);
      setEditedUsername(profile.username);
    }
    setEditing(false);
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

  // Check if viewing own profile
  const isOwnProfile = user && profile && user.id === profile.id;

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
          We couldn't find the profile information you're looking for.
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
            {editing ? (
              <Input
                value={editedUsername}
                onChange={(e) => setEditedUsername(e.target.value)}
                className="text-2xl font-bold mb-2"
                placeholder="Your name"
              />
            ) : (
              <h1 className="text-3xl font-bold">{profile.username}</h1>
            )}
            <div className="flex items-center space-x-2 mt-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Joined {calculateJoinedTime(profile.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          {isOwnProfile ? (
            editing ? (
              <>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={cancelEditing}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  variant="default"
                  size="sm"
                  onClick={handleSaveProfile}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </>
            ) : (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )
          ) : (
            <>
              <Button 
                variant="outline"
                size="sm" 
                className={profile.isLiked ? "text-red-500" : ""}
                onClick={handleLike}
              >
                <Heart className={`h-4 w-4 mr-2 ${profile.isLiked ? "fill-red-500" : ""}`} />
                {profile.likes_count}
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                className="button-hover"
                asChild
              >
                <Link to={`/chat/${profile.id}`}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Link>
              </Button>

              <Button variant="outline" size="sm" className="button-hover" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </>
          )}
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
              {editing ? (
                <Textarea
                  value={editedBio}
                  onChange={(e) => setEditedBio(e.target.value)}
                  className="min-h-[120px]"
                  placeholder="Tell others about yourself..."
                />
              ) : (
                <p className="text-muted-foreground">{profile.bio}</p>
              )}
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
