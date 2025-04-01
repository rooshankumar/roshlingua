import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
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
import { Heart, MessageSquare, Search, Filter, Flame } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from "@/components/ui/badge";
import { toast } from '@/hooks/use-toast';

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
            age // Added age to the selection
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
          streak_count: user.streak_count || 1, // Added streak_count default, now set to 1
          likes_count: user.likes_count || 0, // Added likes_count default
          age: user.age || null, //Added age default
        }));

        setUsers(usersWithDefaults);
        setFilteredUsers(usersWithDefaults);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();

    const channel = supabase
      .channel('public:profiles')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        }, 
        payload => {
          console.log('Real-time update:', payload);
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
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

    if (languageFilter) {
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
    const currentUser = (await supabase.auth.getUser()).data.user?.id;

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('user_likes')
      .select()
      .eq('liker_id', currentUser)
      .eq('liked_id', userId)
      .single();

    if (existingLike) {
      // Unlike if already liked
      const { error } = await supabase
        .from('user_likes')
        .delete()
        .eq('liker_id', currentUser)
        .eq('liked_id', userId);

      if (error) {
        console.error('Error unliking user:', error);
        return;
      }
    } else {
      // Like if not already liked
      const { error } = await supabase
        .from('user_likes')
        .insert([{ liker_id: currentUser, liked_id: userId }]);

      if (error) {
        console.error('Error liking user:', error);
        return;
      }
    }

    // Refresh users to get updated likes count
    const { data: updatedUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('*');

    if (fetchError) {
      console.error('Error fetching updated users:', fetchError);
      return;
    }

    setUsers(updatedUsers || []);
  };

  const { user } = useAuth();

  const handleStartChat = async (otherUserId: string) => {
    try {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to start a chat",
          variant: "destructive",
        });
        return;
      }

      // First check for existing conversation
      const { data: participants, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantsError) throw participantsError;

      if (participants && participants.length > 0) {
        const { data: existingChat } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .in('conversation_id', participants.map(p => p.conversation_id))
          .eq('user_id', otherUserId)
          .maybeSingle();

        if (existingChat) {
          navigate(`/chat/${existingChat.conversation_id}`);
          return;
        }
      }

      // Create new conversation
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert([{
          creator_id: user.id,
          last_message_at: new Date().toISOString()
        }])
        .select('*')
        .single();

      if (conversationError) throw conversationError;

      // Add participants
      const { error: participantsError2 } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConversation.id, user_id: user.id },
          { conversation_id: newConversation.id, user_id: otherUserId }
        ]);

      if (participantsError2) throw participantsError2;

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


  const availableLanguages = Array.from(
    new Set(
      users.flatMap(user => 
        [user.native_language, user.learning_language]
      ).filter(Boolean)
    )
  ).sort();

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex flex-col space-y-4">
        <h1 className="text-2xl font-bold">Community</h1>
        <p className="text-muted-foreground">
          Discover language partners from around the world
        </p>
      </div>

      <div className="bg-card rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, language, or interests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by language" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Languages</SelectLabel>
                  <SelectItem value="all">All Languages</SelectItem>
                  {availableLanguages.map((language) => (
                    <SelectItem key={language} value={language}>
                      {language}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowMoreFilters(!showMoreFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>

            <div className="flex items-center space-x-2">
              <Switch
                id="online-mode"
                checked={onlineOnly}
                onCheckedChange={setOnlineOnly}
              />
              <Label htmlFor="online-mode">Online only</Label>
            </div>
          </div>
        </div>
      </div>

      {filteredUsers.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredUsers.map((user) => (
            <div key={user.id} className="relative group">
              <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-primary/50" />
                <CardContent className="p-0">
                  <div className="relative h-32 bg-gradient-to-b from-primary/10 to-background/5">
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                      <Avatar className="h-20 w-20 ring-4 ring-background">
                        <AvatarImage src={user.avatar_url} className="object-cover" />
                        <AvatarFallback className="text-xl">{user.username?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  <div className="pt-12 px-4 text-center">
                    <h3 className="font-semibold text-lg mb-1 truncate">{user.full_name}</h3>
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                        {user.native_language}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30">
                        {user.learning_language}
                      </Badge>
                    </div>
                    {user.age && (
                      <Badge variant="outline" className="mb-3">
                        {user.age} years old
                      </Badge>
                    )}
                    <Badge variant="secondary" className="mb-4">
                      {user.proficiency_level || 'Beginner'}
                    </Badge>

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 px-2">
                      {user.bio || 'No bio available.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(user.id)}
                        className="hover:text-red-500"
                      >
                        <Heart className="h-4 w-4 mr-1" />
                        <span>{user.likes_count || 0}</span>
                      </Button>
                      <div className="flex items-center text-orange-500">
                        <Flame className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium">{user.streak_count || 0}</span>
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleStartChat(user.id)} 
                      variant="default" 
                      size="sm"
                      className="transition-all duration-300 hover:scale-105"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
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