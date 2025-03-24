import { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import { Search, Filter, Languages, Flame, MessageCircle, Heart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils'


const UserCard = ({ user, onLike }: { user: User; onLike: (userId: string) => void }) => {
  return (
    <Card key={user.id} className="overflow-hidden transition-all hover:shadow-md">
      <div className={`h-2 ${user.online ? "bg-green-500" : "bg-gray-300"}`}></div>
      <CardContent className="p-6">
        <div className="flex space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <Link to={`/profile/${user.id}`} className="hover:underline">
              <h3 className="font-semibold text-lg truncate">{user.name}</h3>
            </Link>

            <div className="flex items-center space-x-1 mt-1">
              <Badge variant="outline" className="text-xs font-normal">
                {user.nativeLanguage} <span className="mx-1">→</span> {user.learningLanguage}
              </Badge>
            </div>

            <div className="flex items-center space-x-2 mt-2">
              <div className="flex items-center text-xs text-muted-foreground">
                <Flame className="h-3 w-3 mr-1 text-primary" />
                <span>{user.streak} day streak</span>
              </div>

              <div className="w-1 h-1 rounded-full bg-muted-foreground"></div>

              <div className="text-xs text-muted-foreground">
                {user.proficiencyLevel}
              </div>
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
            <span>{user.likes}</span>
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
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);

  // Fetch initial users data
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          bio,
          is_online,
          likes_count
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      const formattedUsers = data.map(user => ({
        id: user.id,
        name: user.username,
        nativeLanguage: user.native_language,
        learningLanguage: user.learning_language,
        proficiencyLevel: user.proficiency_level,
        streak: user.streak_count || 0,
        bio: user.bio,
        online: user.is_online,
        avatar: user.avatar_url || '/placeholder.svg',
        likes: user.likes_count || 0,
        liked: false
      }));

      setUsers(formattedUsers);
      setFilteredUsers(formattedUsers);
    };

    fetchUsers();

    // Set up real-time subscription
    const subscription = supabase
      .channel('profiles-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles' 
        }, 
        payload => {
          const { new: newRecord, eventType, old: oldRecord } = payload;

          setUsers(currentUsers => {
            switch (eventType) {
              case 'INSERT':
                return [...currentUsers, {
                  id: newRecord.id,
                  name: newRecord.username,
                  nativeLanguage: newRecord.native_language,
                  learningLanguage: newRecord.learning_language,
                  proficiencyLevel: newRecord.proficiency_level,
                  streak: newRecord.streak_count || 0,
                  bio: newRecord.bio,
                  online: newRecord.is_online,
                  avatar: newRecord.avatar_url || '/placeholder.svg',
                  likes: newRecord.likes_count || 0,
                  liked: false
                }];

              case 'UPDATE':
                return currentUsers.map(user => 
                  user.id === newRecord.id ? {
                    ...user,
                    name: newRecord.username,
                    nativeLanguage: newRecord.native_language,
                    learningLanguage: newRecord.learning_language,
                    proficiencyLevel: newRecord.proficiency_level,
                    streak: newRecord.streak_count || 0,
                    bio: newRecord.bio,
                    online: newRecord.is_online,
                    avatar: newRecord.avatar_url || '/placeholder.svg',
                    likes: newRecord.likes_count || 0
                  } : user
                );

              case 'DELETE':
                return currentUsers.filter(user => user.id !== oldRecord.id);

              default:
                return currentUsers;
            }
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle like functionality
  const handleLike = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          likes_count: user.liked ? user.likes - 1 : user.likes + 1 
        })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            liked: !u.liked,
            likes: u.liked ? u.likes - 1 : u.likes + 1
          };
        }
        return u;
      }));
    } catch (error) {
      console.error('Error updating likes:', error);
    }
  };

  const languages = [
    "English", "Spanish", "French", "German", "Italian",
    "Portuguese", "Chinese", "Japanese", "Korean", "Russian"
  ];

  // Update filtered users when filters change
  useEffect(() => {
    let filtered = [...users];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.bio.toLowerCase().includes(query) ||
        user.nativeLanguage.toLowerCase().includes(query) ||
        user.learningLanguage.toLowerCase().includes(query)
      );
    }

    if (languageFilter) {
      filtered = filtered.filter(user =>
        user.nativeLanguage === languageFilter ||
        user.learningLanguage === languageFilter
      );
    }

    if (onlineOnly) {
      filtered = filtered.filter(user => user.online);
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, languageFilter, onlineOnly]);

  return (
    <div className="container animate-fade-in">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Community</h1>
        <p className="text-muted-foreground">
          Discover language partners from around the world
        </p>
      </div>

      <Card className="glass-card mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, language, or interests..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex space-x-2">
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Languages</SelectItem>
                  {languages.map(lang => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2">
                <Switch
                  id="online-mode"
                  checked={onlineOnly}
                  onCheckedChange={setOnlineOnly}
                />
                <label htmlFor="online-mode">Online Only</label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.map((user) => (
              <div key={user.id} className="flex flex-col p-4 rounded-lg border">
                <div className="flex items-center space-x-3 mb-3">
                  <Avatar>
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.bio}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleLike(user.id)}
                  >
                    <Heart className={cn(
                      "h-4 w-4 mr-2",
                      user.liked && "fill-current text-red-500"
                    )} />
                    {user.likes}
                  </Button>
                  <Button 
                    size="sm"
                    asChild
                  >
                    <Link to={`/chat/${user.id}`}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
};

export default Community;