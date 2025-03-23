
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
  CardDescription, 
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

interface User {
  id: number;
  name: string;
  nativeLanguage: string;
  learningLanguage: string;
  proficiencyLevel: string;
  streak: number;
  bio: string;
  online: boolean;
  avatar: string;
  likes: number;
  liked: boolean;
}

const Community = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  
  useEffect(() => {
    // Mock data for community users
    const mockUsers: User[] = [
      {
        id: 1,
        name: "Sarah Johnson",
        nativeLanguage: "English",
        learningLanguage: "Spanish",
        proficiencyLevel: "Intermediate (B1)",
        streak: 15,
        bio: "Software engineer passionate about learning Spanish for my upcoming trip to Mexico.",
        online: true,
        avatar: "/placeholder.svg",
        likes: 42,
        liked: false
      },
      {
        id: 2,
        name: "Miguel Torres",
        nativeLanguage: "Spanish",
        learningLanguage: "English",
        proficiencyLevel: "Advanced (C1)",
        streak: 23,
        bio: "University student studying international relations. I love helping others learn Spanish!",
        online: true,
        avatar: "/placeholder.svg",
        likes: 31,
        liked: true
      },
      {
        id: 3,
        name: "Akiko Yamamoto",
        nativeLanguage: "Japanese",
        learningLanguage: "French",
        proficiencyLevel: "Beginner (A2)",
        streak: 9,
        bio: "Graphic designer from Tokyo. Love French cinema and want to watch without subtitles someday.",
        online: false,
        avatar: "/placeholder.svg",
        likes: 19,
        liked: false
      },
      {
        id: 4,
        name: "James Wilson",
        nativeLanguage: "English",
        learningLanguage: "Japanese",
        proficiencyLevel: "Intermediate (B2)",
        streak: 31,
        bio: "Tech entrepreneur fascinated by Japanese culture and language. Happy to help with English!",
        online: true,
        avatar: "/placeholder.svg",
        likes: 27,
        liked: false
      },
      {
        id: 5,
        name: "Sophia Chen",
        nativeLanguage: "Chinese",
        learningLanguage: "German",
        proficiencyLevel: "Elementary (A2)",
        streak: 7,
        bio: "Medical student planning to do residency in Berlin. Looking for language exchange partners.",
        online: false,
        avatar: "/placeholder.svg",
        likes: 15,
        liked: false
      },
      {
        id: 6,
        name: "Pierre Dupont",
        nativeLanguage: "French",
        learningLanguage: "Russian",
        proficiencyLevel: "Beginner (A1)",
        streak: 4,
        bio: "Journalist interested in Eastern European politics. Can help with French or English.",
        online: true,
        avatar: "/placeholder.svg",
        likes: 9,
        liked: false
      },
      {
        id: 7,
        name: "Anna Petrova",
        nativeLanguage: "Russian",
        learningLanguage: "Spanish",
        proficiencyLevel: "Upper Intermediate (B2)",
        streak: 19,
        bio: "Literature professor specializing in Latin American authors. Happy to chat in Russian!",
        online: false,
        avatar: "/placeholder.svg",
        likes: 23,
        liked: false
      },
      {
        id: 8,
        name: "Marco Rossi",
        nativeLanguage: "Italian",
        learningLanguage: "English",
        proficiencyLevel: "Advanced (C1)",
        streak: 25,
        bio: "Chef and food blogger. Want to perfect my English for my upcoming cookbook.",
        online: true,
        avatar: "/placeholder.svg",
        likes: 38,
        liked: false
      }
    ];
    
    setUsers(mockUsers);
    setFilteredUsers(mockUsers);
  }, []);
  
  // Apply filters and search
  useEffect(() => {
    let result = [...users];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        user => 
          user.name.toLowerCase().includes(query) || 
          user.bio.toLowerCase().includes(query) ||
          user.nativeLanguage.toLowerCase().includes(query) ||
          user.learningLanguage.toLowerCase().includes(query)
      );
    }
    
    if (languageFilter) {
      result = result.filter(
        user => 
          user.nativeLanguage === languageFilter || 
          user.learningLanguage === languageFilter
      );
    }
    
    if (onlineOnly) {
      result = result.filter(user => user.online);
    }
    
    setFilteredUsers(result);
  }, [users, searchQuery, languageFilter, onlineOnly]);
  
  const handleLike = (userId: number) => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        const liked = !user.liked;
        return {
          ...user,
          liked,
          likes: liked ? user.likes + 1 : user.likes - 1
        };
      }
      return user;
    }));
  };
  
  const languages = [
    "English", "Spanish", "French", "German", "Italian",
    "Portuguese", "Chinese", "Japanese", "Korean", "Russian"
  ];
  
  return (
    <div className="container animate-fade-in">
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
                    onClick={() => handleLike(user.id)}
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
