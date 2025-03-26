import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Search, 
  Filter, 
  Languages, 
  Flame, 
  MessageCircle, 
  Heart 
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface User {
  id: string;
  name: string;
  nativeLanguage: string;
  learningLanguage: string;
  proficiencyLevel: string;
  streak: number;
  bio: string;
  online: boolean;
  avatar: string | null;
  likes: number;
  liked: boolean;
  username: string;
  age?: number;
}

const Community = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);

        // Fetch users with their profile data
        const { data: usersData, error } = await supabase
          .from('users')
          .select(`
            id,
            full_name,
            native_language,
            learning_language,
            proficiency_level,
            streak_count,
            date_of_birth,
            profiles (
              username,
              bio,
              is_online,
              likes_count,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Format users with fallback values
        const formattedUsers = usersData.map((user: any) => ({
          id: user.id,
          name: user.full_name || `User_${user.id.slice(0, 5)}`,
          nativeLanguage: user.native_language || 'Not specified',
          learningLanguage: user.learning_language || 'Not specified',
          proficiencyLevel: user.proficiency_level || 'Beginner',
          streak: user.streak_count || 0,
          bio: user.profiles?.bio || 'Hello! I love learning languages',
          online: user.profiles?.is_online || false,
          avatar: user.profiles?.avatar_url || null,
          likes: user.profiles?.likes_count || 0,
          liked: false,
          username: user.profiles?.username || '',
          age: user.date_of_birth 
            ? new Date().getFullYear() - new Date(user.date_of_birth).getFullYear()
            : undefined
        }));

        setUsers(formattedUsers);
        setFilteredUsers(formattedUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load users",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();

    // Real-time subscription for profile changes
    const subscription = supabase
      .channel('profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          setUsers(prevUsers => 
            prevUsers.map(user => 
              user.id === payload.new.id 
                ? { 
                    ...user, 
                    bio: payload.new.bio || user.bio,
                    online: payload.new.is_online || user.online,
                    avatar: payload.new.avatar_url || user.avatar,
                    likes: payload.new.likes_count || user.likes,
                    username: payload.new.username || user.username
                  } 
                : user
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [toast]);

  // Apply filters and search
  useEffect(() => {
    let result = [...users];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.name.toLowerCase().includes(query) || 
        user.bio.toLowerCase().includes(query) ||
        user.nativeLanguage.toLowerCase().includes(query) ||
        user.learningLanguage.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query)
      );
    }

    if (languageFilter && languageFilter !== "all-languages") {
      result = result.filter(user => 
        user.nativeLanguage === languageFilter || 
        user.learningLanguage === languageFilter
      );
    }

    if (onlineOnly) {
      result = result.filter(user => user.online);
    }

    setFilteredUsers(result);
  }, [users, searchQuery, languageFilter, onlineOnly]);

  const handleLike = async (userId: string) => {
    try {
      // Find the user to get current likes count
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const newLikes = user.liked ? user.likes - 1 : user.likes + 1;

      // Update in database
      const { error } = await supabase
        .from('profiles')
        .update({ likes_count: newLikes })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, liked: !user.liked, likes: newLikes } 
            : user
        )
      );
    } catch (error) {
      console.error('Error updating like:', error);
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive"
      });
    }
  };

  const languages = [
    "English", "Spanish", "French", "German", "Italian",
    "Portuguese", "Chinese", "Japanese", "Korean", "Russian"
  ];

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Loading community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Community</h1>
        <p className="text-muted-foreground">
          Discover language partners from around the world
        </p>
      </div>

      {/* Filters and Search */}
      <Card className="mb-8">
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
                  <SelectItem value="all-languages">All Languages</SelectItem>
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
              <div className={`h-2 ${user.online ? "bg-green-500" : "bg-gray-300"}`}></div>
              <CardContent className="p-6">
                <div className="flex space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user.avatar || undefined} alt={user.name} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${user.id}`} className="hover:underline">
                      <h3 className="font-semibold text-lg truncate">{user.name}</h3>
                    </Link>
                    {user.username && (
                      <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                    )}

                    <div className="flex items-center space-x-1 mt-1">
                      <Badge variant="outline" className="text-xs font-normal">
                        {user.nativeLanguage} → {user.learningLanguage}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-2 mt-2">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Flame className="h-3 w-3 mr-1 text-primary" />
                        <span>{user.streak} day streak</span>
                      </div>

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
                    onClick={() => handleLike(user.id)}
                  >
                    <Heart className={`h-4 w-4 ${user.liked ? "fill-red-500" : ""}`} />
                    <span>{user.likes}</span>
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
              {users.length === 0 
                ? "The community is empty right now." 
                : "No users match your search criteria. Try adjusting your filters."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Community;