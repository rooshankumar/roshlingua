import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from "react-router-dom";
import { Search, Filter,  Heart, MessageCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


type User = {
  id: string;
  full_name: string;
  native_language: string;
  learning_language: string;
  proficiency_level: string;
  streak_count: number;
  avatar_url?: string;
  bio?: string;
  is_online?: boolean;
  likes_count?: number;
};

const Community = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          native_language,
          learning_language,
          proficiency_level,
          streak_count,
          avatar_url,
          bio,
          is_online,
          likes_count
        `);

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setUsers(data || []);
      setFilteredUsers(data || []);
    };

    fetchUsers();

    // Set up real-time subscription
    const channel = supabase
      .channel('public:users')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'users'
        }, 
        payload => {
          console.log('Real-time update:', payload);
          fetchUsers(); // Refetch all users when there's an update
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
      const lowerCaseQuery = searchQuery.toLowerCase();
      result = result.filter(user =>
        user.full_name?.toLowerCase().includes(lowerCaseQuery) ||
        user.native_language?.toLowerCase().includes(lowerCaseQuery) ||
        user.learning_language?.toLowerCase().includes(lowerCaseQuery) ||
        user.bio?.toLowerCase().includes(lowerCaseQuery)
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
  }, [searchQuery, languageFilter, onlineOnly, users]);

  const handleLike = (userId: string) => {
    //  Implementation for liking would go here,  likely involving another Supabase call.
    // This is omitted as it's not directly part of the provided code or intention.
  };

  const languages = [
    "English", "Spanish", "French", "German", "Italian",
    "Portuguese", "Chinese", "Japanese", "Korean", "Russian"
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Community</h1>
        <p className="text-muted-foreground">
          Discover language partners from around the world
        </p>
      </div>

      {/* Filters and Search */}
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
              <Select
                value={languageFilter}
                onValueChange={setLanguageFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Languages</SelectItem>
                  {languages.map((language) => (
                    <SelectItem key={language} value={language}>
                      {language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center">
                    <Filter className="mr-2 h-4 w-4" />
                    More Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuCheckboxItem
                    checked={onlineOnly}
                    onCheckedChange={setOnlineOnly}
                  >
                    Online users only
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User grid */}
      {filteredUsers.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="overflow-hidden transition-all hover:shadow-md">
              <div className={`h-2 ${user.is_online ? "bg-green-500" : "bg-gray-300"}`}></div>
              <CardContent className="p-6">
                <div className="flex space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.full_name} />
                    <AvatarFallback>{user.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${user.id}`} className="hover:underline">
                      <h3 className="font-semibold text-lg truncate">{user.full_name}</h3>
                    </Link>

                    <div className="flex items-center space-x-1 mt-1">
                      <Badge variant="outline" className="text-xs font-normal">
                        {user.native_language} <span className="mx-1">→</span> {user.learning_language}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-2 mt-2">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <MessageCircle className="h-3 w-3 mr-1 text-primary" />
                        <span>{user.streak_count} day streak</span>
                      </div>

                      <div className="w-1 h-1 rounded-full bg-muted-foreground"></div>

                      <div className="text-xs text-muted-foreground">
                        {user.proficiency_level}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
                  {user.bio || "No bio available"}
                </p>

                <div className="flex justify-between mt-4 pt-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex items-center space-x-1`}
                    onClick={() => handleLike(user.id)}
                  >
                    <Heart className={`h-4 w-4 `} />
                    <span>{user.likes_count || 0}</span>
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