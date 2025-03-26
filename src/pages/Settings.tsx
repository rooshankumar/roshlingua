
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Cog, User, Lock, Palette, LogOut, ChevronRight,
  Moon, Sun, Monitor, Smartphone, Globe, Bell, Shield,
  Clock, Target, BookOpen, Languages, BatteryFull
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { signOut } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface SettingsCategoryProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const SettingsCategory = ({ title, description, icon, onClick }: SettingsCategoryProps) => (
  <Card className="cursor-pointer transition-all hover:shadow-md" onClick={onClick}>
    <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 space-y-0">
      <CardTitle className="text-base font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <CardDescription className="text-xs">{description}</CardDescription>
      <div className="flex justify-end mt-4">
        <Button variant="ghost" size="sm">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Theme Preference</h3>
      <RadioGroup
        defaultValue={theme}
        onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div>
          <RadioGroupItem
            value="light"
            id="light"
            className="sr-only"
          />
          <Label
            htmlFor="light"
            className={cn(
              "flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:border-accent cursor-pointer",
              theme === "light" && "border-primary"
            )}
          >
            <Sun className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium">Light</span>
          </Label>
        </div>
        <div>
          <RadioGroupItem
            value="dark"
            id="dark"
            className="sr-only"
          />
          <Label
            htmlFor="dark"
            className={cn(
              "flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:border-accent cursor-pointer",
              theme === "dark" && "border-primary"
            )}
          >
            <Moon className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium">Dark</span>
          </Label>
        </div>
        <div>
          <RadioGroupItem
            value="system"
            id="system"
            className="sr-only"
          />
          <Label
            htmlFor="system"
            className={cn(
              "flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:border-accent cursor-pointer",
              theme === "system" && "border-primary"
            )}
          >
            <Monitor className="h-6 w-6 mb-2" />
            <span className="text-sm font-medium">System</span>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};

const NotificationSettings = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [streakReminders, setStreakReminders] = useState(true);
  const [reminderTime, setReminderTime] = useState("18:00");

  const handleSaveNotifications = async () => {
    // Implementation for saving notification settings to Supabase would go here
    console.log("Saving notification settings:", {
      emailNotifications,
      pushNotifications,
      streakReminders,
      reminderTime
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Notification Settings</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-notifications">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications about your progress via email
            </p>
          </div>
          <Switch
            id="email-notifications"
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications">Push Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications on your device
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={pushNotifications}
            onCheckedChange={setPushNotifications}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="streak-reminders">Streak Reminders</Label>
            <p className="text-sm text-muted-foreground">
              Get reminded to maintain your learning streak
            </p>
          </div>
          <Switch
            id="streak-reminders"
            checked={streakReminders}
            onCheckedChange={setStreakReminders}
          />
        </div>
        
        {streakReminders && (
          <div className="space-y-2">
            <Label htmlFor="reminder-time">Daily Reminder Time</Label>
            <Input
              id="reminder-time"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
            />
          </div>
        )}
      </div>
      
      <Button onClick={handleSaveNotifications}>Save Notification Settings</Button>
    </div>
  );
};

const LearningPreferences = () => {
  const [dailyGoal, setDailyGoal] = useState<number>(15);
  const [difficulty, setDifficulty] = useState<string>("medium");
  
  const handleSaveLearningPreferences = async () => {
    // Implementation for saving learning preferences to Supabase would go here
    console.log("Saving learning preferences:", {
      dailyGoal,
      difficulty
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Learning Preferences</h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="daily-goal">Daily Learning Goal</Label>
            <span className="text-sm font-medium">{dailyGoal} minutes</span>
          </div>
          <Slider
            id="daily-goal"
            min={5}
            max={60}
            step={5}
            value={[dailyGoal]}
            onValueChange={(values) => setDailyGoal(values[0])}
          />
          <p className="text-sm text-muted-foreground">
            Set how much time you want to spend learning each day
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="difficulty">Lesson Difficulty</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Adjust the difficulty level of your lessons
          </p>
        </div>
      </div>
      
      <Button onClick={handleSaveLearningPreferences}>Save Learning Preferences</Button>
    </div>
  );
};

const ProfileSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    avatar_url: "",
    learning_language: "Spanish",
    native_language: "English",
    proficiency_level: "beginner"
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, bio, avatar_url')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error("Error fetching profile:", profileError);
          throw profileError;
        }
        
        // Fetch user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('learning_language, native_language, proficiency_level')
          .eq('id', user.id)
          .single();
          
        if (userError) {
          console.error("Error fetching user data:", userError);
          throw userError;
        }
        
        setFormData({
          username: profileData.username || "",
          bio: profileData.bio || "",
          avatar_url: profileData.avatar_url || "",
          learning_language: userData.learning_language || "Spanish",
          native_language: userData.native_language || "English",
          proficiency_level: userData.proficiency_level || "beginner"
        });
      } catch (error) {
        console.error("Error loading profile data:", error);
        toast({
          variant: "destructive",
          title: "Failed to load profile data",
          description: "Please try again later"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfileData();
  }, [user, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Update profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          bio: formData.bio,
          avatar_url: formData.avatar_url
        })
        .eq('id', user.id);
        
      if (profileError) {
        console.error("Error updating profile:", profileError);
        throw profileError;
      }
      
      // Update user data
      const { error: userError } = await supabase
        .from('users')
        .update({
          learning_language: formData.learning_language,
          native_language: formData.native_language,
          proficiency_level: formData.proficiency_level
        })
        .eq('id', user.id);
        
      if (userError) {
        console.error("Error updating user data:", userError);
        throw userError;
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated"
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        variant: "destructive",
        title: "Failed to update profile",
        description: "Please try again later"
      });
    } finally {
      setLoading(false);
    }
  };

  const languageOptions = [
    "English", "Spanish", "French", "German", "Italian", 
    "Portuguese", "Chinese", "Japanese", "Korean", "Russian", 
    "Arabic", "Hindi", "Dutch", "Swedish", "Finnish"
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Profile Settings</h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="Your display name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Tell others about yourself..."
            rows={3}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="avatar_url">Avatar URL</Label>
          <Input
            id="avatar_url"
            name="avatar_url"
            value={formData.avatar_url}
            onChange={handleInputChange}
            placeholder="https://example.com/your-avatar.jpg"
          />
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <Label htmlFor="native_language">Native Language</Label>
          <Select 
            name="native_language" 
            value={formData.native_language} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, native_language: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your native language" />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map(lang => (
                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="learning_language">Learning Language</Label>
          <Select 
            name="learning_language" 
            value={formData.learning_language} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, learning_language: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select language you're learning" />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map(lang => (
                <SelectItem key={lang} value={lang}>{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="proficiency_level">Proficiency Level</Label>
          <Select 
            name="proficiency_level" 
            value={formData.proficiency_level} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, proficiency_level: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your proficiency level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="native">Native</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Button 
        onClick={handleSaveProfile} 
        disabled={loading}
        className="w-full"
      >
        {loading ? 'Saving...' : 'Save Profile'}
      </Button>
    </div>
  );
};

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: "Please try again later"
      });
    }
  };

  // List of setting categories
  const settingsCategories = [
    {
      id: "account",
      title: "Account Settings",
      description: "Manage your account details and preferences",
      icon: <User className="h-5 w-5 text-primary" />,
    },
    {
      id: "privacy",
      title: "Privacy & Security",
      description: "Control who can see your profile and activity",
      icon: <Shield className="h-5 w-5 text-primary" />,
    },
    {
      id: "appearance",
      title: "Appearance",
      description: "Customize the look and feel of the application",
      icon: <Palette className="h-5 w-5 text-primary" />,
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Set your notification preferences",
      icon: <Bell className="h-5 w-5 text-primary" />,
    },
    {
      id: "language",
      title: "Language & Region",
      description: "Change your language and regional settings",
      icon: <Globe className="h-5 w-5 text-primary" />,
    },
    {
      id: "learning",
      title: "Learning Preferences",
      description: "Customize your learning experience",
      icon: <BookOpen className="h-5 w-5 text-primary" />,
    }
  ];

  const renderSelectedSettings = () => {
    switch (selectedSetting) {
      case "appearance":
        return <ThemeSelector />;
      case "notifications":
        return <NotificationSettings />;
      case "learning":
        return <LearningPreferences />;
      case "account":
        return <ProfileSettings />;
      default:
        return (
          <div className="text-center py-12">
            <Cog className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">Settings under construction</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              This settings section is currently being developed. Check back soon for updates!
            </p>
            <Button 
              className="mt-4" 
              variant="outline" 
              onClick={() => setSelectedSetting(null)}
            >
              Back to Settings
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="container py-8 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Customize your experience and manage your account
          </p>
        </div>
        <Button variant="destructive" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>

      {!selectedSetting ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {settingsCategories.map((category) => (
            <SettingsCategory
              key={category.id}
              title={category.title}
              description={category.description}
              icon={category.icon}
              onClick={() => setSelectedSetting(category.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle>
                {settingsCategories.find(c => c.id === selectedSetting)?.title}
              </CardTitle>
              <CardDescription>
                {settingsCategories.find(c => c.id === selectedSetting)?.description}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedSetting(null)}>
              Back to Settings
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            {renderSelectedSettings()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Settings;
