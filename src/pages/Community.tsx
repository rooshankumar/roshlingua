
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
import { Profile, User as UserType } from '@/types/schema';
import UserAvatar from '@/components/UserAvatar';

interface UserProfile {
  id: string;
  username: string;
  bio: string;
  avatar_url: string | null;
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
          <UserAvatar 
            src={user.avatar_url} 
            fallback={user.username} 
            size="lg"
            status={user.is_online ? "online" : "offline"}
          />

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

  useEffect(() => {
    if (!user) return;

    const fetchProfiles = async () => {
      try {
        setLoading(true);
        console.log("Fetching profiles for user:", user.id);
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, bio, is_online, likes_count, avatar_url')
          .neq('id', user.id);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          toast({
            variant: "destructive",
            title: "Failed to load community profiles",
            description: "Please try again later."
          });
          setLoading(false);
          return;
        }
        
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, native_language, learning_language, proficiency_level, streak_count, gender, date_of_birth');
          
        if (usersError) {
          console.error('Error fetching users data:', usersError);
          toast({
            variant: "destructive",
            title: "Failed to load user details",
            description: "Please try again later."
          });
          setLoading(false);
          return;
        }

        const { data: likes, error: likesError } = await supabase
          .from('user_likes')
          .select('liked_id')
          .eq('liker_id', user.id);

        if (likesError) {
          console.error('Error fetching likes:', likesError);
        }

        const likedProfiles = new Set<string>();
        if (likes) {
          likes.forEach(like => {
            if (like && typeof like === 'object' && 'liked_id' in like) {
              likedProfiles.add(like.liked_id as string);
            }
          });
        }

        const formattedProfiles = profilesData
          .filter(profile => profile !== null)
          .map(profile => {
            if (!profile || typeof profile !== 'object') {
              return null;
            }
            
            const profileRecord = profile as Record<string, any>;
            if (!('id' in profileRecord)) {
              return null;
            }
            
            const profileId = profileRecord.id as string;
            
            // Find the matching user data - Fix the type error by ensuring userData is not undefined
            const userData = usersData?.find(user => {
              if (!user || typeof user !== 'object') return false;
              return 'id' in user && user.id === profileId;
            }) || {};
            
            // Now userData is guaranteed to be an object (either with values or empty)
            // We need to safely access properties with type checking
            let age = null;
            if (userData && 
                typeof userData === 'object' && 
                'date_of_birth' in userData && 
                userData.date_of_birth) {
              const birthDate = new Date(userData.date_of_birth as string);
              const today = new Date();
              age = today.getFullYear() - birthDate.getFullYear();
              const m = today.getMonth() - birthDate.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }
            }

            return {
              id: profileId,
              username: profileRecord.username as string || 'Anonymous',
              bio: profileRecord.bio as string || 'No bio available',
              avatar_url: profileRecord.avatar_url as string || null,
              native_language: typeof userData === 'object' && 
                               'native_language' in userData ? 
                               (userData.native_language as string) : 'Unknown',
              learning_language: typeof userData === 'object' && 
                                 'learning_language' in userData ? 
                                 (userData.learning_language as string) : 'Unknown',
              proficiency_level: typeof userData === 'object' && 
                                 'proficiency_level' in userData ? 
                                 (userData.proficiency_level as string) : 'beginner',
              streak_count: typeof userData === 'object' && 
                            'streak_count' in userData ? 
                            (userData.streak_count as number) : 0,
              likes_count: profileRecord.likes_count as number || 0,
              is_online: profileRecord.is_online as boolean || false,
              gender: typeof userData === 'object' && 
                      'gender' in userData ? 
                      (userData.gender as string) : undefined,
              age,
              liked: likedProfiles.has(profileId)
            };
          })
          .filter(Boolean) as UserProfile[];

        setProfiles(formattedProfiles);
        setFilteredProfiles(formattedProfiles);
        setLoading(false);
      } catch (error) {
        console.error('Error in fetchProfiles:', error);
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Failed to load community",
          description: "An unexpected error occurred. Please try again."
        });
      }
    };

    fetchProfiles();

    const setupRealtimeSubscriptions = () => {
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
            setProfiles(currentProfiles => {
              const index = currentProfiles.findIndex(p => p.id === payload.new.id);
              
              if (payload.eventType === 'DELETE') {
                return currentProfiles.filter(p => p.id !== payload.old.id);
              } else if (index >= 0) {
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
                fetchProfiles();
                return currentProfiles;
              }
              
              return currentProfiles;
            });
          }
        )
        .subscribe();

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
            fetchProfiles();
          }
        )
        .subscribe();

      setChannels([profilesChannel, likesChannel, usersChannel]);
    };

    setupRealtimeSubscriptions();

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, toast]);

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

      const success = await toggleProfileLike(user.id, profileId);
      
      if (!success) {
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

  const languages = [
    "English", "Spanish", "French", "German", "Italian",
    "Portuguese", "Chinese", "Japanese", "Korean", "Russian",
    "Arabic", "Hindi", "Dutch", "Swedish", "Finnish"
  ];

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
