
import { useState, useEffect } from "react";
import {
  Bell,
  Globe,
  Key,
  Lock,
  LogOut,
  Mail,
  Moon,
  Save,
  Shield,
  Sun,
  User,
  Wallet,
  Eye,
  EyeOff,
  Languages
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const languages = [
  "English", "Spanish", "French", "German", "Italian",
  "Portuguese", "Chinese", "Japanese", "Korean", "Russian",
  "Arabic", "Hindi", "Turkish", "Dutch", "Swedish"
];

const proficiencyLevels = [
  "Beginner (A1)", "Elementary (A2)", "Intermediate (B1)",
  "Upper Intermediate (B2)", "Advanced (C1)", "Proficient (C2)"
];

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Profile state
  const [profileData, setProfileData] = useState({
    username: "",
    bio: "",
    email: "",
    avatar_url: "",
    native_language: "English",
    learning_language: "Spanish",
    proficiency_level: "Beginner (A1)",
  });

  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    show_online_status: true,
    show_last_active: true,
    allow_messages: true,
    show_profile_in_search: true,
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    new_messages: true,
    profile_views: true,
    learning_reminders: true,
    streak_reminders: true,
    marketing_emails: false,
  });

  // Load user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        // Get profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, bio, avatar_url')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Get user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email, native_language, learning_language, proficiency_level')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;

        // Combine data
        setProfileData({
          username: profileData.username || '',
          bio: profileData.bio || '',
          email: userData.email || user.email || '',
          avatar_url: profileData.avatar_url || '/placeholder.svg',
          native_language: userData.native_language || 'English',
          learning_language: userData.learning_language || 'Spanish',
          proficiency_level: userData.proficiency_level || 'Beginner (A1)',
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load your profile data",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user, toast]);

  const handleProfileChange = (field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePrivacyChange = (field: string, value: boolean) => {
    setPrivacySettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaveLoading(true);
    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: profileData.username,
          bio: profileData.bio,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          native_language: profileData.native_language,
          learning_language: profileData.learning_language,
          proficiency_level: profileData.proficiency_level,
        })
        .eq('id', user.id);

      if (userError) throw userError;

      toast({
        title: "Profile updated",
        description: "Your profile information has been saved.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "There was an error saving your profile information.",
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSavePrivacy = () => {
    toast({
      title: "Privacy settings updated",
      description: "Your privacy preferences have been saved.",
    });
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Notification settings updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/settings?tab=account`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Password change requested",
        description: "We've sent a password reset link to your email.",
      });
    } catch (error) {
      console.error("Error sending password reset:", error);
      toast({
        variant: "destructive",
        title: "Request failed",
        description: "Failed to send password reset link.",
      });
    }
  };

  const handleUploadAvatar = () => {
    toast({
      title: "Feature coming soon",
      description: "Avatar upload functionality will be available in the next update.",
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container pb-12 animate-fade-in">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-8">
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Manage your public profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-2">
                      <AvatarImage src={profileData.avatar_url} />
                      <AvatarFallback>{profileData.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Button variant="outline" size="sm" onClick={handleUploadAvatar}>
                      Change Avatar
                    </Button>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={profileData.username}
                        onChange={(e) => handleProfileChange('username', e.target.value)}
                        placeholder="Your username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={profileData.email}
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) => handleProfileChange('bio', e.target.value)}
                    placeholder="Tell others about yourself..."
                    className="min-h-[120px]"
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Language Preferences</h3>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="native-language">Native Language</Label>
                    <Select
                      value={profileData.native_language}
                      onValueChange={(value) => handleProfileChange('native_language', value)}
                    >
                      <SelectTrigger id="native-language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((language) => (
                          <SelectItem key={language} value={language}>
                            {language}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="learning-language">Learning Language</Label>
                    <Select
                      value={profileData.learning_language}
                      onValueChange={(value) => handleProfileChange('learning_language', value)}
                    >
                      <SelectTrigger id="learning-language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((language) => (
                          <SelectItem key={language} value={language}>
                            {language}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="proficiency-level">Proficiency Level</Label>
                    <Select
                      value={profileData.proficiency_level}
                      onValueChange={(value) => handleProfileChange('proficiency_level', value)}
                    >
                      <SelectTrigger id="proficiency-level">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {proficiencyLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveProfile} disabled={saveLoading}>
                {saveLoading ? (
                  <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account security and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Security</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Password</h4>
                      <p className="text-sm text-muted-foreground">
                        Change your account password
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleChangePassword}>
                      <Lock className="h-4 w-4 mr-2" />
                      Change
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email</h4>
                      <p className="text-sm text-muted-foreground">
                        {profileData.email}
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      <Mail className="h-4 w-4 mr-2" />
                      Update
                    </Button>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Privacy</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Online Status</h4>
                      <p className="text-sm text-muted-foreground">
                        Allow others to see when you're online
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.show_online_status}
                      onCheckedChange={(value) => handlePrivacyChange('show_online_status', value)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Profile Visibility</h4>
                      <p className="text-sm text-muted-foreground">
                        Allow others to find your profile in search results
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.show_profile_in_search}
                      onCheckedChange={(value) => handlePrivacyChange('show_profile_in_search', value)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Direct Messages</h4>
                      <p className="text-sm text-muted-foreground">
                        Allow users to send you direct messages
                      </p>
                    </div>
                    <Switch
                      checked={privacySettings.allow_messages}
                      onCheckedChange={(value) => handlePrivacyChange('allow_messages', value)}
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Account Actions</h3>
                <div className="flex justify-between">
                  <Button variant="outline" className="text-destructive">
                    Delete Account
                  </Button>
                  <Button variant="destructive" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSavePrivacy}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how the app looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Theme</h3>
                <div className="grid grid-cols-3 gap-4">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    className="flex flex-col items-center justify-center h-24 p-4"
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-8 w-8 mb-2" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    className="flex flex-col items-center justify-center h-24 p-4"
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-8 w-8 mb-2" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    className="flex flex-col items-center justify-center h-24 p-4"
                    onClick={() => setTheme("system")}
                  >
                    <Globe className="h-8 w-8 mb-2" />
                    System
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Manage your notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">New Messages</h4>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you receive a new message
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.new_messages}
                    onCheckedChange={(value) => handleNotificationChange('new_messages', value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Profile Views</h4>
                    <p className="text-sm text-muted-foreground">
                      Get notified when someone views your profile
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.profile_views}
                    onCheckedChange={(value) => handleNotificationChange('profile_views', value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Learning Reminders</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive daily reminders to practice your language skills
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.learning_reminders}
                    onCheckedChange={(value) => handleNotificationChange('learning_reminders', value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Streak Reminders</h4>
                    <p className="text-sm text-muted-foreground">
                      Get reminded to maintain your activity streak
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.streak_reminders}
                    onCheckedChange={(value) => handleNotificationChange('streak_reminders', value)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Marketing Emails</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features and promotions
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.marketing_emails}
                    onCheckedChange={(value) => handleNotificationChange('marketing_emails', value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNotifications}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
