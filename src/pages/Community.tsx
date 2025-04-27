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

import { SUPPORTED_LANGUAGES } from '@/utils/languageUtils';

// Helper function to get flag emoji for language
const getLanguageFlag = (language?: string) => {
  if (!language) return "🌐";
  
  // First try to find language in our supported languages array
  const supportedLang = SUPPORTED_LANGUAGES.find(
    lang => lang.name.toLowerCase() === language.toLowerCase()
  );
  
  if (supportedLang) {
    return supportedLang.flag;
  }
  
  // Fallback to a simple map for languages not in SUPPORTED_LANGUAGES
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
  };
  
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
              className="overflow-hidden cursor-pointer hover:shadow-md transition-all group border hover:border-primary/30"
              onClick={() => navigate(`/profile/${user.id}`)}
            >              
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {/* Avatar with online indicator */}
                  <div className="relative">
                    <Avatar className="h-14 w-14 border-2 border-primary/10">
                      <AvatarImage src={user.avatar_url} className="object-cover" />
                      <AvatarFallback className="text-lg">{user.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className={cn(
                      "absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-background",
                      user.is_online ? "bg-green-500" : "bg-gray-300"
                    )} />
                  </div>
                  
                  {/* Name and age */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-base group-hover:text-primary transition-colors">{user.full_name}</h3>
                      <span className="text-sm text-muted-foreground">{user.age || '–'}</span>
                    </div>
                    
                    {/* Languages */}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs py-0 px-1.5 h-5">
                        <span className="mr-1" aria-label={`Flag for ${user.native_language}`}>{getLanguageFlag(user.native_language)}</span> 
                        <span>{user.native_language}</span>
                      </Badge>
                      <span className="text-primary">→</span>
                      <Badge variant="outline" className="text-xs py-0 px-1.5 h-5 bg-primary/5">
                        <span className="mr-1" aria-label={`Flag for ${user.learning_language}`}>{getLanguageFlag(user.learning_language)}</span>
                        <span>{user.learning_language}</span>
                      </Badge>
                    </div>
                  </div>
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