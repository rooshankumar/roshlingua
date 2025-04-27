import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { LikeButton } from "@/components/LikeButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Heart, Search, Filter, Flame, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from "@/components/ui/badge";
import { toast } from '@/hooks/use-toast';
import classNames from 'classnames';
import { cn } from "@/lib/utils";

// Helper function to get flag emoji for language
const getLanguageFlag = (language?: string) => {
  if (!language) return "🌐";
  
  const languageToFlag: Record<string, string> = {
    'English': '🇬🇧',
    'Spanish': '🇪🇸',
    'French': '🇫🇷',
    'German': '🇩🇪',
    'Italian': '🇮🇹',
    'Portuguese': '🇵🇹',
    'Russian': '🇷🇺',
    'Japanese': '🇯🇵',
    'Korean': '🇰🇷',
    'Chinese': '🇨🇳',
    'Arabic': '🇸🇦',
    'Hindi': '🇮🇳',
    'Turkish': '🇹🇷',
    'Dutch': '🇳🇱',
    'Swedish': '🇸🇪',
    'Polish': '🇵🇱',
    'Norwegian': '🇳🇴',
    'Danish': '🇩🇰',
    'Finnish': '🇫🇮',
    'Czech': '🇨🇿',
    'Greek': '🇬🇷',
    'Hungarian': '🇭🇺',
    'Romanian': '🇷🇴',
    'Thai': '🇹🇭',
    'Vietnamese': '🇻🇳',
    'Indonesian': '🇮🇩',
    'Hebrew': '🇮🇱',
    // Add more languages as needed
  };
  
  // Return the flag if found
  return languageToFlag[language] || '🌐';
};

interface User {
  id: string;
  full_name: string;
  native_language: string;
  learning_language: string;
  proficiency_level: string;
  streak_count: number;
  avatar_url: string;
  bio: string;
  is_online: boolean;
  likes_count: number;
  username: string;
  date_of_birth: string | null;
  age: number | null; // Added age property
}

const Community = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false); // Added state for more filters
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const currentUser = (await supabase.auth.getUser()).data.user;

        const { data, error } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            native_language,
            learning_language,
            proficiency_level,
            bio,
            avatar_url,
            streak_count,
            likes_count,
            date_of_birth,
            age
          `)
          .neq('id', currentUser?.id);

        if (error) {
          console.error("Error fetching users:", error);
          return;
        }

        // Use data directly from users table with defaults
        const usersWithDefaults = (data || []).map(user => ({
          ...user,
          username: user.username || user.full_name,
          full_name: user.full_name || 'Anonymous User',
          avatar_url: user.avatar_url || '/placeholder.svg',
          bio: user.bio || 'No bio available',
          native_language: user.native_language || 'English',
          learning_language: user.learning_language || 'Spanish',
          proficiency_level: user.proficiency_level || 'beginner',
          is_online: user.is_online || false,
          streak_count: user.streak_count || 1,
          likes_count: user.likes_count || 0,
          age: user.date_of_birth ? Math.floor((new Date().getTime() - new Date(user.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        }));

        setUsers(usersWithDefaults);
        setFilteredUsers(usersWithDefaults);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();

    // Create a more robust real-time subscription
    const channel = supabase
      .channel('public:profiles:changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        payload => {
          console.log('Real-time profile update received:', payload);
          
          // Update the specific user in the state rather than re-fetching all users
          if (payload.new && payload.eventType) {
            setUsers(prevUsers => {
              // For INSERT event, add the new user if they're not already in the list
              if (payload.eventType === 'INSERT' && !prevUsers.some(u => u.id === payload.new.id)) {
                // Don't add the current user to the list
                const isCurrentUser = payload.new.id === user?.id;
                if (!isCurrentUser) {
                  return [...prevUsers, payload.new as User];
                }
              }
              
              // For UPDATE event, update the existing user
              else if (payload.eventType === 'UPDATE') {
                return prevUsers.map(u => 
                  u.id === payload.new.id ? { ...u, ...payload.new } : u
                );
              }
              
              // For DELETE event, remove the user
              else if (payload.eventType === 'DELETE' && payload.old) {
                return prevUsers.filter(u => u.id !== payload.old.id);
              }
              
              return prevUsers;
            });
            
            // Also update filtered users to reflect changes immediately
            setFilteredUsers(prevFiltered => {
              // Apply the same filtering logic as in the useEffect
              let updatedUsers = [...users];
              
              if (searchQuery) {
                updatedUsers = updatedUsers.filter(user =>
                  user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  user.native_language?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  user.learning_language?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  user.bio?.toLowerCase().includes(searchQuery.toLowerCase())
                );
              }
              
              if (languageFilter) {
                updatedUsers = updatedUsers.filter(user =>
                  user.native_language === languageFilter ||
                  user.learning_language === languageFilter
                );
              }
              
              if (onlineOnly) {
                updatedUsers = updatedUsers.filter(user => user.is_online);
              }
              
              return updatedUsers;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Community real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to real-time updates');
        } else if (status !== 'SUBSCRIBED') {
          console.warn('Real-time subscription issue:', status);
          // Try to reconnect if needed
          setTimeout(() => fetchUsers(), 3000);
        }
      });

    // Fetch users initially
    fetchUsers();

    return () => {
      console.log('Unsubscribing from real-time updates');
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let result = [...users];

    if (searchQuery) {
      result = result.filter(user =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.native_language?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.learning_language?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (languageFilter && languageFilter !== 'all') {
      result = result.filter(user =>
        user.native_language === languageFilter ||
        user.learning_language === languageFilter
      );
    }

    if (onlineOnly) {
      result = result.filter(user => user.is_online);
    }

    setFilteredUsers(result);
  }, [users, searchQuery, languageFilter, onlineOnly]);

  const handleLike = async (userId: string) => {
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) {
        toast({
          title: "Error",
          description: "You must be logged in to like users",
          variant: "destructive",
        });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!profile) {
        toast({
          title: "Error",
          description: "User not found",
          variant: "destructive",
        });
        return;
      }

      // Use LikeButton component instead of direct DB operations
      const likeButton = document.querySelector(`button[data-user-id="${userId}"]`) as HTMLButtonElement;
      if (likeButton) {
        likeButton.click();
        // Update the user's likes_count after liking
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({ likes_count: profile.likes_count + 1 })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating likes count:', updateError);
          toast({
            title: "Error",
            description: "Failed to update likes count",
            variant: "destructive",
          });
          return;
        }
      }
    } catch (error) {
      console.error('Error handling like:', error);
      toast({
        title: "Error",
        description: "Failed to process like action",
        variant: "destructive",
      });
    }
  };

  // Chat functionality removed - users can only chat from full profile view


  const availableLanguages = Array.from(
    new Set(
      users.flatMap(user =>
        [user.native_language, user.learning_language]
      ).filter(Boolean)
    )
  ).sort();

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex flex-col space-y-1 mb-6">
        <h1 className="text-2xl font-bold">Community</h1>
        <p className="text-muted-foreground">
          Find language partners who match your learning goals
        </p>
      </div>

      <div className="bg-card/50 border rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {availableLanguages.map((language) => (
                  <SelectItem key={language} value={language || "unknown"}>
                    {language || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 bg-background rounded-md px-3 py-1.5 border">
              <Switch
                id="online-mode"
                checked={onlineOnly}
                onCheckedChange={setOnlineOnly}
                className="data-[state=checked]:bg-green-500"
              />
              <Label htmlFor="online-mode" className="text-sm cursor-pointer">
                Online only
              </Label>
            </div>
          </div>
        </div>
      </div>

      {filteredUsers.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredUsers.map((user) => (
            <Card 
              key={user.id} 
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-all group relative border border-border/50 hover:border-primary/20"
              onClick={() => navigate(`/profile/${user.id}`)}
            >
              {/* Card top background with decorative pattern */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent h-24 w-full" />
              
              {/* Like button positioned on top right */}
              <div 
                className="absolute top-3 right-3 z-10" 
                onClick={e => e.stopPropagation()}
              >
                <LikeButton
                  targetUserId={user.id}
                  currentUserId={user?.id}
                  className="hover:text-red-500 bg-background/80 backdrop-blur-sm p-1.5 rounded-full shadow-sm"
                />
              </div>
              
              <CardContent className="p-0">
                {/* Profile section */}
                <div className="pt-6 px-5 pb-3 relative z-[1]">
                  {/* Avatar with online indicator */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-16 w-16 border-4 border-background shadow-md">
                        <AvatarImage src={user.avatar_url} className="object-cover" />
                        <AvatarFallback className="text-lg">{user.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "absolute bottom-1 right-1 block h-3 w-3 rounded-full border-2 border-background",
                        user.is_online ? "bg-green-500" : "bg-gray-300"
                      )} />
                    </div>
                    
                    {/* User name and languages */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">{user.full_name}</h3>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                        <span>{getLanguageFlag(user.native_language)}</span>
                        <span className="font-medium">{user.native_language}</span>
                        <span className="mx-1 text-primary/60">→</span>
                        <span>{getLanguageFlag(user.learning_language)}</span>
                        <span className="font-medium">{user.learning_language}</span>
                      </div>
                      
                      {/* Level badge */}
                      <Badge variant="outline" className="mt-1.5 text-xs bg-primary/5 border-primary/10">
                        {user.proficiency_level?.charAt(0).toUpperCase() + user.proficiency_level?.slice(1) || 'Beginner'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Bio snippet */}
                  {user.bio && (
                    <div className="mt-3 text-xs text-muted-foreground line-clamp-2 h-9 overflow-hidden">
                      {user.bio}
                    </div>
                  )}
                </div>
                
                {/* Stats section */}
                <div className="grid grid-cols-3 border-t mt-1">
                  <div className="flex flex-col items-center py-2 border-r">
                    <span className="text-xs text-muted-foreground">Streak</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Flame className="h-3 w-3 text-orange-500" />
                      <span className="font-medium text-sm">{user.streak_count || 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center py-2 border-r">
                    <span className="text-xs text-muted-foreground">Likes</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Heart className="h-3 w-3 text-red-500" />
                      <span className="font-medium text-sm">{user.likes_count || 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center py-2">
                    <span className="text-xs text-muted-foreground">Age</span>
                    <span className="font-medium text-sm">{user.age || '–'}</span>
                  </div>
                </div>
                
                {/* View profile button */}
                <div className="px-3 pb-3 pt-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full text-xs justify-center gap-1 py-1 h-8 hover:bg-primary hover:text-primary-foreground group-hover:bg-primary/10 transition-colors"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>View Profile</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No users found</h3>
            <p className="text-muted-foreground max-w-md">
              We couldn't find any users matching your search criteria. Try adjusting your filters or search query.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Community;