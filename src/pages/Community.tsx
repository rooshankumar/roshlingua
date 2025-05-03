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
import { Heart, Search, Filter, Flame, User, X, Globe, ArrowRight, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from '@/hooks/use-toast';
import classNames from 'classnames';
import { cn } from "@/lib/utils";
import { ChevronUp } from 'lucide-react'; // Added import for ChevronUp icon

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

  // Filter states
  const [languageFilter, setLanguageFilter] = useState("any");
  const [nativeLanguageFilter, setNativeLanguageFilter] = useState("any");
  const [learningLanguageFilter, setLearningLanguageFilter] = useState("any");
  const [minAgeFilter, setMinAgeFilter] = useState<number | null>(null);
  const [maxAgeFilter, setMaxAgeFilter] = useState<number | null>(null);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false); // Added state for scroll button

  const navigate = useNavigate();
  const { user } = useAuth();

  // Get the count of active filters for the badge
  const getFilterCount = () => {
    let count = 0;
    if (nativeLanguageFilter && nativeLanguageFilter !== "any") count++;
    if (learningLanguageFilter && learningLanguageFilter !== "any") count++;
    if (minAgeFilter !== null || maxAgeFilter !== null) count++;
    if (onlineOnly) count++;
    return count > 0 ? count : '';
  };

  // Reset all filters to default values
  const resetFilters = () => {
    setSearchQuery("");
    setLanguageFilter("any");
    setNativeLanguageFilter("any");
    setLearningLanguageFilter("any");
    setMinAgeFilter(null);
    setMaxAgeFilter(null);
    setOnlineOnly(false);
  };

  // Render badges for active filters
  const renderActiveFilterBadges = () => {
    const badges = [];

    if (nativeLanguageFilter && nativeLanguageFilter !== "any") {
      badges.push(
        <Badge 
          key="native" 
          variant="secondary" 
          className="flex items-center gap-1 pl-2 pr-1 py-1 shadow-sm hover:bg-secondary/30 transition-colors cursor-pointer group"
          onClick={() => setNativeLanguageFilter("any")}
        >
          <span className="mr-1">{getLanguageFlag(nativeLanguageFilter)}</span>
          <span>Native: {nativeLanguageFilter}</span>
          <X className="h-3 w-3 ml-1 group-hover:scale-110 transition-transform" />
        </Badge>
      );
    }

    if (learningLanguageFilter && learningLanguageFilter !== "any") {
      badges.push(
        <Badge 
          key="learning" 
          variant="secondary" 
          className="flex items-center gap-1 pl-2 pr-1 py-1 shadow-sm hover:bg-secondary/30 transition-colors cursor-pointer group"
          onClick={() => setLearningLanguageFilter("any")}
        >
          <span className="mr-1">{getLanguageFlag(learningLanguageFilter)}</span>
          <span>Learning: {learningLanguageFilter}</span>
          <X className="h-3 w-3 ml-1 group-hover:scale-110 transition-transform" />
        </Badge>
      );
    }

    if (minAgeFilter !== null || maxAgeFilter !== null) {
      badges.push(
        <Badge 
          key="age" 
          variant="secondary" 
          className="flex items-center gap-1 pl-2 pr-1 py-1 shadow-sm hover:bg-secondary/30 transition-colors cursor-pointer group"
          onClick={() => {
            setMinAgeFilter(null);
            setMaxAgeFilter(null);
          }}
        >
          <User className="h-3 w-3 mr-1" />
          <span>Age: {minAgeFilter || '18'}—{maxAgeFilter || '100'}</span>
          <X className="h-3 w-3 ml-1 group-hover:scale-110 transition-transform" />
        </Badge>
      );
    }

    if (onlineOnly) {
      badges.push(
        <Badge 
          key="online" 
          variant="outline" 
          className="flex items-center gap-1 pl-2 pr-1 py-1 border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400 shadow-sm hover:bg-green-500/20 transition-colors cursor-pointer group"
          onClick={() => setOnlineOnly(false)}
        >
          <span className="h-2 w-2 rounded-full bg-green-500 inline-block mr-1"></span>
          <span>Online only</span>
          <X className="h-3 w-3 ml-1 group-hover:scale-110 transition-transform" />
        </Badge>
      );
    }

    return badges;
  };

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

            // We'll rely on the useEffect dependency array to update filtered users
            // This ensures consistent filtering logic in one place
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

    // Apply search query filter
    if (searchQuery) {
      result = result.filter(user =>
        (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.native_language?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.learning_language?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.bio?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply native language filter (with null check)
    if (nativeLanguageFilter && nativeLanguageFilter !== "any") {
      result = result.filter(user => 
        user.native_language && user.native_language.toLowerCase() === nativeLanguageFilter.toLowerCase()
      );
    }

    // Apply learning language filter (with null check)
    if (learningLanguageFilter && learningLanguageFilter !== "any") {
      result = result.filter(user => 
        user.learning_language && user.learning_language.toLowerCase() === learningLanguageFilter.toLowerCase()
      );
    }

    // Apply age range filters with proper null checks
    if (minAgeFilter !== null) {
      result = result.filter(user => 
        user.age !== null && user.age !== undefined && user.age >= minAgeFilter
      );
    }

    if (maxAgeFilter !== null) {
      result = result.filter(user => 
        user.age !== null && user.age !== undefined && user.age <= maxAgeFilter
      );
    }

    // Apply online status filter
    if (onlineOnly) {
      result = result.filter(user => Boolean(user.is_online));
    }

    setFilteredUsers(result);
  }, [users, searchQuery, nativeLanguageFilter, learningLanguageFilter, minAgeFilter, maxAgeFilter, onlineOnly]);

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

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.pageYOffset > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex flex-col space-y-1 mb-6">
        <h1 className="text-2xl font-bold">Community</h1>
        <p className="text-muted-foreground">
          Find language partners who match your learning goals
        </p>
      </div>

      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 backdrop-blur-sm border rounded-xl p-6 mb-8 shadow-md">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex-1 relative w-full group">
            <div className="absolute inset-0 bg-primary/5 rounded-md -z-10 opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary/50 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by name or language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 bg-background/50 backdrop-blur-sm border-primary/20 focus:border-primary/50 transition-all"
            />
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-primary/20 hover:border-primary/50 bg-background/50 backdrop-blur-sm hover:bg-background/80">
                  <Filter className="h-4 w-4 text-primary" />
                  <span>Filters</span>
                  {getFilterCount() && (
                    <Badge variant="secondary" className="h-5 w-5 p-0 ml-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {getFilterCount()}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-xl">
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Find Your Perfect Language Partners</DialogTitle>
                    <DialogDescription>
                      Customize your search to connect with the right people
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <div className="grid gap-6 p-6">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Globe className="mr-2 h-5 w-5 text-primary" />
                      <h3 className="text-base font-medium">Languages</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="native-language" className="text-sm flex items-center gap-1">
                          Native Language
                        </Label>
                        <Select 
                          value={nativeLanguageFilter} 
                          onValueChange={setNativeLanguageFilter}
                        >
                          <SelectTrigger id="native-language" className="bg-background/50">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            {availableLanguages.filter(Boolean).map((language) => (
                              <SelectItem key={`native-${language}`} value={language}>
                                <span className="mr-2">{getLanguageFlag(language)}</span> {language}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="learning-language" className="text-sm flex items-center gap-1">
                          Learning Language
                        </Label>
                        <Select 
                          value={learningLanguageFilter} 
                          onValueChange={setLearningLanguageFilter}
                        >
                          <SelectTrigger id="learning-language" className="bg-background/50">
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            {availableLanguages.filter(Boolean).map((language) => (
                              <SelectItem key={`learning-${language}`} value={language}>
                                <span className="mr-2">{getLanguageFlag(language)}</span> {language}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center">
                      <User className="mr-2 h-5 w-5 text-primary" />
                      <h3 className="text-base font-medium">Age Range</h3>
                    </div>
                    <div className="bg-background/50 p-4 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">{minAgeFilter || 18}</span>
                        <span className="text-sm">{maxAgeFilter || 100}</span>
                      </div>
                      <div className="flex items-center gap-4 mb-4">
                        <Input
                          type="range"
                          min="18"
                          max={(maxAgeFilter || 100) - 1}
                          value={minAgeFilter || 18}
                          onChange={(e) => setMinAgeFilter(Number(e.target.value))}
                          className="flex-1 h-2 accent-primary"
                        />
                        <Input
                          type="range" 
                          min={(minAgeFilter || 18) + 1}
                          max="100"
                          value={maxAgeFilter || 100}
                          onChange={(e) => setMaxAgeFilter(Number(e.target.value))}
                          className="flex-1 h-2 accent-primary"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="grid flex-1 gap-1">
                          <Label htmlFor="min-age" className="text-xs text-muted-foreground">Min Age</Label>
                          <Input
                            id="min-age"
                            type="number"
                            min="18"
                            max={(maxAgeFilter || 100) - 1}
                            value={minAgeFilter !== null ? minAgeFilter : ''}
                            onChange={(e) => setMinAgeFilter(e.target.value ? Number(e.target.value) : null)}
                            placeholder="18"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="grid flex-1 gap-1">
                          <Label htmlFor="max-age" className="text-xs text-muted-foreground">Max Age</Label>
                          <Input
                            id="max-age"
                            type="number"
                            min={(minAgeFilter || 18) + 1}
                            max="100"
                            value={maxAgeFilter !== null ? maxAgeFilter : ''}
                            onChange={(e) => setMaxAgeFilter(e.target.value ? Number(e.target.value) : null)}
                            placeholder="100"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <Switch
                      id="online-mode"
                      checked={onlineOnly}
                      onCheckedChange={setOnlineOnly}
                      className="data-[state=checked]:bg-green-500"
                    />
                    <div>
                      <Label htmlFor="online-mode" className="cursor-pointer font-medium flex items-center">
                        <span className="mr-2 h-2 w-2 rounded-full bg-green-500 inline-block"></span>
                        Online users only
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">Only show users who are currently active</p>
                    </div>
                  </div>
                </div>

                <div className="border-t">
                  <div className="p-4 flex justify-between items-center">
                    <Button 
                      variant="ghost" 
                      onClick={resetFilters}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Reset Filters
                    </Button>
                    <DialogClose asChild>
                      <Button className="px-6">Apply Filters</Button>
                    </DialogClose>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Active filters */}
            <div className="flex flex-wrap gap-2 animate-in fade-in">
              {renderActiveFilterBadges()}
            </div>
          </div>
        </div>
      </div>

      {filteredUsers.length > 0 ? (
        <div className="grid gap-0 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 container mx-auto">
          {filteredUsers.map((user) => (
            <Card 
              key={user.id} 
              className="overflow-hidden cursor-pointer group border-0 border-b hover:border-primary/30 hover:shadow-lg transition-all bg-card/50 backdrop-blur-sm rounded-none"
              onClick={() => navigate(`/profile/${user.id}`)}
            >              
              <CardContent className="p-4">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user.avatar_url} alt={user.full_name} className="object-cover" />
                      <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span 
                      className={cn(
                        "absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-background",
                        user.is_online ? "bg-green-500" : "bg-gray-400"
                      )} 
                    />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{user.full_name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{user.age || '–'} years</p>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2" title={`Native: ${user.native_language}`}>
                        <span className="text-xl" aria-label={`Native language: ${user.native_language}`}>
                          {getLanguageFlag(user.native_language)}
                        </span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex items-center gap-2" title={`Learning: ${user.learning_language}`}>
                        <span className="text-xl" aria-label={`Learning language: ${user.learning_language}`}>
                          {getLanguageFlag(user.learning_language)}
                        </span>
                      </div>
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

      {/* Scroll to top button */}
      {showScrollTop && (
        <Button
          variant="secondary"
          size="icon"
          className="fixed bottom-20 right-6 z-50 rounded-full shadow-lg animate-fade-up hover:shadow-xl transition-all"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ChevronUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default Community;