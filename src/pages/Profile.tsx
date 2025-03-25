import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Edit, Heart, MessageCircle, User, ArrowLeft, Calendar, Flag, Rocket, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/providers/AuthProvider";
import { supabase, toggleProfileLike, hasUserLikedProfile } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Profile as ProfileType, User as UserType } from "@/types/schema";
import { useRealtimeProfile } from "@/hooks/useRealtimeProfile";
import { Label } from "@/components/ui/label";

interface UserProfileData {
  id: string;
  email: string;
  full_name: string;
  native_language: string;
  learning_language: string;
  proficiency_level: string;
  gender?: string;
  date_of_birth?: string;
  learning_goal?: string;
  avatar_url?: string;
  streak_count: number;
  username?: string;
  bio?: string;
  likes_count: number;
  is_online: boolean;
}

const Profile = () => {
  const { id: profileId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    bio: "",
    learning_goal: "",
    avatar_url: "",
  });

  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    const targetId = profileId || (user?.id ?? '');
    setIsCurrentUser(!profileId || profileId === user?.id);
    
    const fetchProfileData = async () => {
      try {
        setIsLoading(true);
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetId)
          .single();
        
        if (profileError) {
          console.error("Error fetching profile:", profileError);
          throw profileError;
        }
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', targetId)
          .single();
        
        if (userError) {
          console.error("Error fetching user details:", userError);
          throw userError;
        }

        if (!isCurrentUser && user) {
          const isLiked = await hasUserLikedProfile(user.id, targetId);
          setHasLiked(isLiked);
        }
        
        const profileObj = profileData as Record<string, any> || {};
        const userObj = userData as Record<string, any> || {};
        
        const combinedData: UserProfileData = {
          id: targetId,
          email: userObj.email || '',
          full_name: userObj.full_name || '',
          native_language: userObj.native_language || 'English',
          learning_language: userObj.learning_language || 'Spanish',
          proficiency_level: userObj.proficiency_level || 'beginner',
          gender: userObj.gender || undefined,
          date_of_birth: userObj.date_of_birth || undefined,
          learning_goal: userObj.learning_goal || undefined,
          avatar_url: userObj.avatar_url || undefined,
          streak_count: userObj.streak_count || 0,
          username: profileObj.username || '',
          bio: profileObj.bio || '',
          likes_count: profileObj.likes_count || 0,
          is_online: profileObj.is_online || false,
        };
        
        setProfileData(combinedData);
        setEditForm({
          username: combinedData.username || '',
          bio: combinedData.bio || '',
          learning_goal: combinedData.learning_goal || '',
          avatar_url: combinedData.avatar_url || '',
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error in fetchProfileData:", error);
        toast({
          variant: "destructive",
          title: "Error loading profile",
          description: "Could not load the profile data. Please try again."
        });
        if (!profileId) {
          navigate('/dashboard');
        }
        setIsLoading(false);
      }
    };

    fetchProfileData();
    setupRealtimeSubscription(targetId);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [profileId, user, navigate, toast]);

  const setupRealtimeSubscription = (userId: string) => {
    const newChannel = supabase
      .channel(`profile:${userId}`)
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        }, 
        (payload) => {
          console.log('Profile update:', payload);
          
          if (profileData && payload.new) {
            setProfileData(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                username: payload.new.username || prev.username,
                bio: payload.new.bio || prev.bio,
                likes_count: payload.new.likes_count || prev.likes_count,
                is_online: payload.new.is_online || false
              };
            });
          }
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          console.log('User update:', payload);
          
          if (profileData && payload.new) {
            setProfileData(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                full_name: payload.new.full_name || prev.full_name,
                native_language: payload.new.native_language || prev.native_language,
                learning_language: payload.new.learning_language || prev.learning_language,
                proficiency_level: payload.new.proficiency_level || prev.proficiency_level,
                gender: payload.new.gender,
                date_of_birth: payload.new.date_of_birth,
                learning_goal: payload.new.learning_goal,
                avatar_url: payload.new.avatar_url,
                streak_count: payload.new.streak_count || 0
              };
            });
          }
        }
      )
      .subscribe();
    
    setChannel(newChannel);
  };

  const handleSave = async () => {
    if (!user || !profileData) return;

    try {
      setIsLoading(true);

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          username: editForm.username,
          bio: editForm.bio,
          avatar_url: editForm.avatar_url,
        })
        .eq('id', user.id);

      if (profileUpdateError) {
        console.error("Error updating profile:", profileUpdateError);
        throw profileUpdateError;
      }

      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          learning_goal: editForm.learning_goal,
        })
        .eq('id', user.id);

      if (userUpdateError) {
        console.error("Error updating user:", userUpdateError);
        throw userUpdateError;
      }

      setProfileData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          username: editForm.username,
          bio: editForm.bio,
          learning_goal: editForm.learning_goal,
          avatar_url: editForm.avatar_url,
        };
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error updating profile",
        description: "Could not update profile. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!user || !profileData) return;

    try {
      setIsLikeLoading(true);
      const success = await toggleProfileLike(user.id, profileData.id);

      if (success) {
        setHasLiked(!hasLiked);
        setProfileData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            likes_count: hasLiked ? prev.likes_count - 1 : prev.likes_count + 1,
          };
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update like status. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An error occurred while updating like status.",
      });
    } finally {
      setIsLikeLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="container flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <X className="w-10 h-10 text-red-500" />
          <p className="mt-4 text-muted-foreground">Profile not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isCurrentUser ? "Your Profile" : profileData.username}
        </h1>
        <div>
          {isCurrentUser ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleToggleLike} disabled={isLikeLoading}>
              {isLikeLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Heart className={`h-4 w-4 mr-2 ${hasLiked ? "fill-red-500" : ""}`} />
                  {profileData.likes_count} Likes
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profileData.avatar_url || "/placeholder.svg"} alt={profileData.full_name} />
              <AvatarFallback>{profileData.full_name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold">{profileData.full_name}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {profileData.username && `@${profileData.username}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Native Language:</p>
              <p className="text-muted-foreground">{profileData.native_language}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Learning Language:</p>
              <p className="text-muted-foreground">{profileData.learning_language} ({profileData.proficiency_level})</p>
            </div>
            <div>
              <p className="text-sm font-medium">Streak:</p>
              <div className="flex items-center">
                <Rocket className="h-4 w-4 mr-1 text-primary" />
                <p className="text-muted-foreground">{profileData.streak_count} days</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Online Status:</p>
              <div className="flex items-center">
                {profileData.is_online ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                    <p className="text-green-500">Online</p>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-1 text-gray-500" />
                    <p className="text-gray-500">Offline</p>
                  </>
                )}
              </div>
            </div>
            {profileData.gender && (
              <div>
                <p className="text-sm font-medium">Gender:</p>
                <p className="text-muted-foreground">{profileData.gender}</p>
              </div>
            )}
            {profileData.date_of_birth && (
              <div>
                <p className="text-sm font-medium">Date of Birth:</p>
                <p className="text-muted-foreground">{profileData.date_of_birth}</p>
              </div>
            )}
          </div>
          <Separator className="my-4" />
          <div>
            <p className="text-sm font-medium">Bio:</p>
            <p className="text-muted-foreground">{profileData.bio}</p>
          </div>
          {profileData.learning_goal && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm font-medium">Learning Goal:</p>
                <p className="text-muted-foreground">{profileData.learning_goal}</p>
              </div>
            </>
          )}
        </CardContent>
        {!isCurrentUser && (
          <CardFooter className="justify-between">
            <Button variant="ghost">
              <Heart className="h-4 w-4 mr-2" />
              {profileData.likes_count} Likes
            </Button>
            <Button asChild variant="outline">
              <a href={`/chat/${profileData.id}`}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Start Chat
              </a>
            </Button>
          </CardFooter>
        )}
      </Card>

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your profile information.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="learning_goal">Learning Goal</Label>
                <Input
                  id="learning_goal"
                  value={editForm.learning_goal}
                  onChange={(e) => setEditForm({ ...editForm, learning_goal: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="avatar_url">Avatar URL</Label>
                <Input
                  id="avatar_url"
                  value={editForm.avatar_url}
                  onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Profile;
