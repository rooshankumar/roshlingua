
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Heart, MessageCircle, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
}

const Community = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      // Add default values for missing user info
      const usersWithDefaults = (data || []).map(user => ({
        ...user,
        full_name: user.full_name || 'Anonymous User',
        avatar_url: user.avatar_url || '/placeholder.svg',
        bio: user.bio || 'No bio available',
        native_language: user.native_language || 'Not specified',
        learning_language: user.learning_language || 'Not specified',
        is_online: user.is_online || false
      }));

      setUsers(usersWithDefaults);
      setFilteredUsers(usersWithDefaults);
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
    const { error } = await supabase
      .from('user_likes')
      .insert([
        { liker_id: (await supabase.auth.getUser()).data.user?.id, liked_id: userId }
      ]);

    if (error) {
      console.error('Error liking user:', error);
      return;
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

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, language, or interests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by language" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="">All Languages</SelectItem>
                  {availableLanguages.map((language) => (
                    <SelectItem key={language} value={language}>
                      {language}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Switch
                id="online-mode"
                checked={onlineOnly}
                onCheckedChange={setOnlineOnly}
              />
              <Label htmlFor="online-mode">Online only</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{user.full_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {user.native_language} → {user.learning_language}
                    </p>
                  </div>
                  {user.is_online && (
                    <div className="ml-auto">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {user.bio}
                </p>

                <div className="flex justify-between mt-4 pt-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center space-x-1"
                    onClick={() => handleLike(user.id)}
                  >
                    <Heart className="h-4 w-4" />
                    <span>{user.likes_count || 0}</span>
                  </Button>

                  <Button asChild variant="outline" size="sm">
                    <Link to={`/chat/${user.id}`}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Start Chat
                    </Link>
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
