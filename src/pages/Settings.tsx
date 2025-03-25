
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Cog, User, Lock, Palette, LogOut, ChevronRight, Save,
  Moon, Sun, Monitor, Smartphone, Globe, Bell, Shield,
  Check, X, Edit, Key, Eye, EyeOff
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useUserWithProfile } from "@/hooks/useProfiles";

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
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('theme') || 'system';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', systemTheme === 'dark');
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Theme Preference</h3>
      <RadioGroup
        value={theme}
        onValueChange={setTheme}
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

const AccountSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const { data: userData, isLoading, refetch } = useUserWithProfile(user?.id || '');
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    email: '',
    avatarUrl: ''
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        username: userData.profile?.username || '',
        bio: userData.profile?.bio || '',
        email: userData.email || '',
        avatarUrl: userData.profile?.avatar_url || ''
      });
    }
  }, [userData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          bio: formData.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (profileError) throw profileError;
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated."
      });
      
      setIsEditing(false);
      refetch();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Failed to update your profile."
      });
    }
  };

  const uploadAvatar = async () => {
    if (!user) return;
    
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/avatar.${fileExt}`;

        toast({
          title: "Uploading...",
          description: "Please wait while we upload your avatar."
        });

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Update the profile with the new avatar URL
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);

        if (updateError) {
          throw updateError;
        }

        setFormData({
          ...formData,
          avatarUrl: publicUrl
        });
        
        toast({
          title: "Avatar updated",
          description: "Your profile picture has been updated."
        });
        
        refetch();
      };

      input.click();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "There was an error uploading your avatar."
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Account Information</h3>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={formData.avatarUrl || "/placeholder.svg"} alt="Profile" />
            <AvatarFallback>{formData.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          {isEditing && (
            <Button 
              className="absolute bottom-0 right-0 rounded-full h-8 w-8 p-0" 
              size="sm"
              onClick={uploadAvatar}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="space-y-1">
          {isEditing ? (
            <Input
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="font-medium text-lg"
              placeholder="Your username"
            />
          ) : (
            <h4 className="font-medium text-lg">{userData?.profile?.username || 'No username set'}</h4>
          )}
          <p className="text-sm text-muted-foreground">{userData?.email}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        {isEditing ? (
          <Textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Tell us about yourself"
            className="resize-none"
            rows={4}
          />
        ) : (
          <p className="text-sm p-3 bg-muted rounded-md">
            {userData?.profile?.bio || 'No bio set'}
          </p>
        )}
      </div>

      <div className="pt-4">
        <h4 className="font-medium mb-2">Language Information</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Native Language</p>
            <p>{userData?.native_language || 'Not set'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Learning</p>
            <p>{userData?.learning_language || 'Not set'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Proficiency</p>
            <p>{userData?.proficiency_level || 'Not set'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Streak</p>
            <p>{userData?.streak_count || 0} days</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PrivacySettings = () => {
  const [showEmail, setShowEmail] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Privacy Settings</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Show Email</h4>
            <p className="text-sm text-muted-foreground">Allow other users to see your email address</p>
          </div>
          <Switch
            checked={showEmail}
            onCheckedChange={setShowEmail}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Activity Status</h4>
            <p className="text-sm text-muted-foreground">Show your learning activity to other users</p>
          </div>
          <Switch
            checked={showActivity}
            onCheckedChange={setShowActivity}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Online Status</h4>
            <p className="text-sm text-muted-foreground">Show when you're online to other users</p>
          </div>
          <Switch
            checked={showOnlineStatus}
            onCheckedChange={setShowOnlineStatus}
          />
        </div>
      </div>
      
      <Separator />
      
      <div>
        <h4 className="font-medium mb-2">Account Security</h4>
        <Button variant="outline" className="w-full justify-start">
          <Key className="h-4 w-4 mr-2" />
          Change Password
        </Button>
      </div>
    </div>
  );
};

const NotificationSettings = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [chatNotifications, setChatNotifications] = useState(true);
  const [learningReminders, setLearningReminders] = useState(true);
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Notification Preferences</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Email Notifications</h4>
            <p className="text-sm text-muted-foreground">Receive important updates via email</p>
          </div>
          <Switch
            checked={emailNotifications}
            onCheckedChange={setEmailNotifications}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Chat Notifications</h4>
            <p className="text-sm text-muted-foreground">Get notified of new messages</p>
          </div>
          <Switch
            checked={chatNotifications}
            onCheckedChange={setChatNotifications}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Learning Reminders</h4>
            <p className="text-sm text-muted-foreground">Daily reminders to practice your language</p>
          </div>
          <Switch
            checked={learningReminders}
            onCheckedChange={setLearningReminders}
          />
        </div>
      </div>
    </div>
  );
};

const Settings = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      await logout();
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
      id: "device",
      title: "Device Settings",
      description: "Manage device-specific preferences",
      icon: <Smartphone className="h-5 w-5 text-primary" />,
    }
  ];

  const renderSelectedSettings = () => {
    switch (selectedSetting) {
      case "account":
        return <AccountSettings />;
      case "privacy":
        return <PrivacySettings />;
      case "appearance":
        return <ThemeSelector />;
      case "notifications":
        return <NotificationSettings />;
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
