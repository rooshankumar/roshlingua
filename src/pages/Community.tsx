
import { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import { Search, Filter, Languages, Flame, MessageCircle, Heart, User, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { supabase, toggleProfileLike, hasUserLikedProfile } from '@/lib/supabase';
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Slider } from "@/components/ui/slider";
import { RealtimeChannel } from '@supabase/supabase-js';

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
  is_online: boolean;
  gender?: string;
  age?: number;
  liked: boolean; // Whether the current user has liked this profile
}

interface UserData {
  id: string;
  native_language: string;
  learning_language: string;
  proficiency_level: string;
  streak_count: number;
  gender?: string;
  date_of_birth?: string;
}

const UserCard = ({ 
  user, 
  onLike, 
  currentUserId 
}: { 
  user: UserProfile; 
  onLike: (userId: string) => Promise<void>;
  currentUserId: string;
}) => {
  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${user.is_online ? 'border-green-500/30' : ''}`}>
      <div className={`h-2 ${user.is_online ? "bg-green-500" : "bg-gray-300"}`}></div>
      <CardContent className="p-6">
        <div className="flex space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.username} />
            <AvatarFallback>{user.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <Link to={`/profile/${user.id}`} className="hover:underline">
              <h3 className="font-semibold text-lg truncate">{user.username}</h3>
            </Link>

            <div className="flex items-center space-x-1 mt-1">
              <Badge variant="outline" className="text-xs font-normal">
                {user.native_language} <span className="mx-1">→</span> {user.learning_language}
              </Badge>
            </div>

            <div className="flex items-center space-x-2 mt-2">
              <div className="flex items-center text-xs text-muted-foreground">
                <Flame className="h-3 w-3 mr-1 text-primary" />
                <span>{user.streak_count} day streak</span>
              </div>

              <div className="w-1 h-1 rounded-full bg-muted-foreground"></div>

              <div className="text-xs text-muted-foreground">
                {user.proficiency_level}
              </div>

              {user.gender && (
                <>
                  <div className="w-1 h-1 rounded-full bg-muted-foreground"></div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <User className="h-3 w-3 mr-1" />
                    <span>{user.gender}</span>
                  </div>
                </>
              )}

              {user.age && (
                <>
                  <div className="w-1 h-1 rounded-full bg-muted-foreground"></div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{user.age}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
          {user.bio}
        </p>

        <div className="flex justify-between mt-4 pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className={`flex items-center space-x-1 ${user.liked ? "text-red-500" : ""}`}
            onClick={() => onLike(user.id)}
          >
            <Heart className={`h-4 w-4 ${user.liked ? "fill-red-500" : ""}`} />
            <span>{user.likes_count}</span>
          </Button>

          <Button asChild variant="outline" size="sm" className="button-hover">
            <Link to={`/chat/${user.id}`}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Start Chat
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Community = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 80]);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<RealtimeChannel[]>([]);

  // Fetch profiles and handle real-time updates
  useEffect(() => {
    if (!user) return;

    const fetchProfiles = async () => {
      try {
        setLoading(true);
        console.log("Fetching profiles for user:", user.id);
        
        // First get all profiles except the current user
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, bio, avatar_url, is_online, likes_count')
          .neq('id', user.id);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return;
        }
        
        // Then get all users data
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, native_language, learning_language, proficiency_level, streak_count, gender, date_of_birth');
          
        if (usersError) {
          console.error('Error fetching users data:', usersError);
          return;
        }

        // Check which profiles the current user has liked
        const { data: likes, error: likesError } = await supabase
          .from('user_likes')
          .select('liked_id')
          .eq('liker_id', user.id);

        if (likesError) {
          console.error('Error fetching likes:', likesError);
          return;
        }

        const likedProfiles = new Set<string>();
        if (likes) {
          likes.forEach(like => likedProfiles.add(like.liked_id));
        }

        // Join profiles with user data
        const formattedProfiles = profilesData.map(profile => {
          const userData = usersData.find(u => u.id === profile.id);
          
          let age = null;
          if (userData?.date_of_birth) {
            const birthDate = new Date(userData.date_of_birth);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
          }

          return {
            id: profile.id,
            username: profile.username || 'Anonymous',
            bio: profile.bio || 'No bio available',
            avatar_url: profile.avatar_url,
            native_language: userData?.native_language || 'Unknown',
            learning_language: userData?.learning_language || 'Unknown',
            proficiency_level: userData?.proficiency_level || 'beginner',
            streak_count: userData?.streak_count || 0,
            likes_count: profile.likes_count || 0,
            is_online: profile.is_online || false,
            gender: userData?.gender,
            age: age,
            liked: likedProfiles.has(profile.id)
          };
        });

        setProfiles(formattedProfiles);
        setFilteredProfiles(formattedProfiles);
        setLoading(false);
      } catch (error) {
        console.error('Error in fetchProfiles:', error);
        setLoading(false);
      }
    };

    fetchProfiles();

    // Set up real-time subscription for various changes
    const setupRealtimeSubscriptions = () => {
      // Channel for profiles changes
      const profilesChannel = supabase
        .channel('public:profiles')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'profiles',
            filter: `id=neq.${user.id}`
          }, 
          (payload) => {
            console.log('Profile change detected:', payload);
            // Update profiles state based on the change
            setProfiles(currentProfiles => {
              // Find if this profile exists in our current state
              const index = currentProfiles.findIndex(p => p.id === payload.new.id);
              
              // Handle different event types
              if (payload.eventType === 'DELETE') {
                // Remove the profile if it was deleted
                return currentProfiles.filter(p => p.id !== payload.old.id);
              } else if (index >= 0) {
                // Update existing profile
                const updatedProfiles = [...currentProfiles];
                updatedProfiles[index] = {
                  ...updatedProfiles[index],
                  username: payload.new.username || updatedProfiles[index].username,
                  bio: payload.new.bio || updatedProfiles[index].bio,
                  avatar_url: payload.new.avatar_url,
                  likes_count: payload.new.likes_count || 0,
                  is_online: payload.new.is_online || false
                };
                return updatedProfiles;
              } else if (payload.eventType === 'INSERT') {
                // We need to fetch the complete profile data for new insertions
                fetchProfiles();
                return currentProfiles;
              }
              
              return currentProfiles;
            });
          }
        )
        .subscribe();

      // Channel for user_likes changes
      const likesChannel = supabase
        .channel('public:user_likes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'user_likes',
            filter: `liker_id=eq.${user.id}`
          }, 
          (payload) => {
            console.log('User like change detected:', payload);
            // Update the liked status for profiles
            setProfiles(currentProfiles => {
              if (payload.eventType === 'INSERT') {
                return currentProfiles.map(profile => 
                  profile.id === payload.new.liked_id 
                    ? { ...profile, liked: true } 
                    : profile
                );
              } else if (payload.eventType === 'DELETE') {
                return currentProfiles.map(profile => 
                  profile.id === payload.old.liked_id 
                    ? { ...profile, liked: false } 
                    : profile
                );
              }
              return currentProfiles;
            });
          }
        )
        .subscribe();

      // Channel for users changes
      const usersChannel = supabase
        .channel('public:users')
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'users'
          }, 
          (payload) => {
            console.log('User data change detected:', payload);
            // We need to refetch all profiles since user data changed
            fetchProfiles();
          }
        )
        .subscribe();

      setChannels([profilesChannel, likesChannel, usersChannel]);
    };

    setupRealtimeSubscriptions();

    // Clean up subscriptions on unmount
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user]);

  // Update filtered profiles when filters change
  useEffect(() => {
    if (!profiles.length) return;
    
    let filtered = [...profiles];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(profile => 
        (profile.username?.toLowerCase().includes(query) || false) ||
        (profile.bio?.toLowerCase().includes(query) || false) ||
        profile.native_language.toLowerCase().includes(query) ||
        profile.learning_language.toLowerCase().includes(query)
      );
    }

    if (languageFilter && languageFilter !== 'all') {
      filtered = filtered.filter(profile =>
        profile.native_language === languageFilter ||
        profile.learning_language === languageFilter
      );
    }

    if (genderFilter && genderFilter !== 'all') {
      filtered = filtered.filter(profile =>
        profile.gender === genderFilter
      );
    }

    if (ageRange[0] !== 18 || ageRange[1] !== 80) {
      filtered = filtered.filter(profile =>
        profile.age ? (profile.age >= ageRange[0] && profile.age <= ageRange[1]) : true
      );
    }

    if (onlineOnly) {
      filtered = filtered.filter(profile => profile.is_online);
    }

    setFilteredProfiles(filtered);
  }, [profiles, searchQuery, languageFilter, genderFilter, ageRange, onlineOnly]);

  // Handle like functionality
  const handleLike = async (profileId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to like profiles",
        variant: "destructive"
      });
      return;
    }

    try {
      // Optimistic UI update
      setProfiles(currentProfiles => 
        currentProfiles.map(profile => {
          if (profile.id === profileId) {
            const newLiked = !profile.liked;
            return {
              ...profile,
              liked: newLiked,
              likes_count: newLiked 
                ? profile.likes_count + 1 
                : Math.max(0, profile.likes_count - 1)
            };
          }
          return profile;
        })
      );

      // Perform the actual toggle like operation
      const success = await toggleProfileLike(user.id, profileId);
      
      if (!success) {
        // Revert the optimistic update if operation failed
        setProfiles(currentProfiles => 
          currentProfiles.map(profile => {
            if (profile.id === profileId) {
              const revertedLiked = !profile.liked;
              return {
                ...profile,
                liked: revertedLiked,
                likes_count: revertedLiked 
                  ? profile.likes_count + 1 
                  : Math.max(0, profile.likes_count - 1)
              };
            }
            return profile;
          })
        );
        
        toast({
          title: "Action failed",
          description: "Could not update like status",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Action failed",
        description: "An error occurred while updating like status",
        variant: "destructive"
      });
    }
  };

  // Get list of languages for the filter
  const languages = [
    "English", "Spanish", "French", "German", "Italian",
    "Portuguese", "Chinese", "Japanese", "Korean", "Russian",
    "Arabic", "Hindi", "Dutch", "Swedish", "Finnish"
  ];

  // Gender options
  const genders = ["Male", "Female", "Non-binary", "Other"];

  return (
    <div className="container animate-fade-in py-6">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Community</h1>
        <p className="text-muted-foreground">
          Discover language partners from around the world
        </p>
      </div>

      <Card className="glass-card mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, language, or interests..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  {languages.map(lang => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  {genders.map(gender => (
                    <SelectItem key={gender} value={gender}>{gender}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Age Range: {ageRange[0]} - {ageRange[1]}</p>
                <Slider
                  value={[ageRange[0], ageRange[1]]}
                  min={18}
                  max={80}
                  step={1}
                  onValueChange={(value) => setAgeRange([value[0], value[1]])}
                  className="py-2"
                />
              </div>

              <div className="flex items-center space-x-2 bg-card p-2 rounded-md border">
                <Switch
                  id="online-mode"
                  checked={onlineOnly}
                  onCheckedChange={setOnlineOnly}
                />
                <label htmlFor="online-mode" className="text-sm">Online Only</label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredProfiles.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProfiles.map((profile) => (
            <UserCard 
              key={profile.id} 
              user={profile} 
              onLike={handleLike}
              currentUserId={user?.id || ''}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-2">No users found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters to find language partners
          </p>
        </div>
      )}
    </div>
  );
};

export default Community;
