import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/components/theme-provider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { useRealtimeProfile } from "@/hooks/useRealtimeProfile";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Shield, Bell, Key, User, Lock, Mail, Save, LogOut, Moon, Sun, Globe, Wallet } from "lucide-react";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, updateProfile } = useRealtimeProfile(user?.id);
  const navigate = useNavigate();
  const [localBio, setLocalBio] = useState(profile?.bio || "");

  const languages = [
    "English", "Spanish", "French", "German", "Italian",
    "Portuguese", "Chinese", "Japanese", "Korean", "Russian",
    "Arabic", "Hindi", "Turkish", "Dutch", "Swedish"
  ];

  const proficiencyLevels = [
    "Beginner (A1)", "Elementary (A2)", "Intermediate (B1)", 
    "Upper Intermediate (B2)", "Advanced (C1)", "Proficient (C2)"
  ];

  const genders = ["Male", "Female", "Rather not say"];

  const [localProfile, setLocalProfile] = useState(profile || {});

  const handleProfileChange = (field: string, value: string) => {
    setLocalProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to update your profile.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user: updatedUser }, error } = await supabase.auth.updateUser({
        data: {
          ...localProfile,
          bio: localBio,
          updated_at: new Date().toISOString()
        }
      });

      if (error) throw error;

      if (updatedUser?.user_metadata) {
        updateProfile({ ...profile, ...updatedUser.user_metadata, bio: localBio });
      }

      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }

    try {
      const updates = {
        raw_user_meta_data: {
          ...user.user_metadata,
          full_name: localProfile.full_name,
          bio: localBio,
          native_language: localProfile.native_language,
          learning_language: localProfile.learning_language,
          proficiency_level: localProfile.proficiency_level,
          gender: localProfile.gender,
          updated_at: new Date().toISOString()
        }
      };

      const { error } = await supabase.auth.updateUser(updates);

      if (error) throw error;

      updateProfile({ ...profile, ...updates.raw_user_meta_data });

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Initialize local state when profile changes
  useEffect(() => {
    if (profile) {
      setLocalProfile(profile);
    }
  }, [profile]);

  const handleProfileFieldChange = async (field: string, value: string) => {
    setLocalProfile(prev => ({
      ...prev,
      [field]: value
    }));

    try {
      const { data, error } = await supabase
        .from('users')
        .update({ [field]: value })
        .eq('id', user?.id);

      if (error) throw error;

      if (data) {
        updateProfile({ ...profile, [field]: value });
        toast({
          title: "Success",
          description: "Profile updated successfully"
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfile({ ...profile, avatar_url: publicUrl });

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully.",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive"
      });
    }
  };

  const [privacySettings, setPrivacySettings] = useState({
    showOnlineStatus: true,
    showLastActive: true,
    allowMessages: true,
    showProfileInSearch: true,
  });

  const handlePrivacyChange = (field: string, value: boolean) => {
    setPrivacySettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSavePrivacy = () => {
    toast({
      title: "Privacy settings updated",
      description: "Your privacy preferences have been saved.",
    });
  };


  const [notificationSettings, setNotificationSettings] = useState({
    newMessages: true,
    profileViews: true,
    learningReminders: true,
    streakReminders: true,
    marketingEmails: false,
  });

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Notification settings updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const handleChangePassword = () => {
    toast({
      title: "Password change requested",
      description: "We've sent a password reset link to your email.",
    });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const genderOptions = ["Male", "Female", "Rather not say"];

  return (
    <div className="container pb-12 animate-fade-in">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="mb-8">
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="profile" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center">
            <Key className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Account</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and language preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row md:space-x-6">
                <div className="flex flex-col items-center space-y-4 mb-6 md:mb-0">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                    <AvatarFallback>{profile?.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-center gap-2">
                    <input
                      type="file"
                      id="avatar"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUploadAvatar}
                    />
                    <Button variant="outline" onClick={() => document.getElementById('avatar')?.click()}>
                      Change Avatar
                    </Button>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        value={profile?.full_name || ""}
                        onChange={(e) => handleProfileFieldChange("full_name", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={profile?.email || ""}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea 
                        id="bio" 
                        value={localBio}
                        onChange={(e) => setLocalBio(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select 
                        value={profile?.gender || ""}
                        onValueChange={(value) => handleProfileFieldChange("gender", value)}
                      >
                        <SelectTrigger id="gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          {genderOptions.map((gender) => (
                            <SelectItem key={gender} value={gender}>
                              {gender}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Language Settings</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nativeLanguage">Native Language</Label>
                    <Select
                      value={profile?.native_language || ""}
                      onValueChange={(value) => handleProfileFieldChange("native_language", value)}
                    >
                      <SelectTrigger id="nativeLanguage">
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
                    <Label htmlFor="learningLanguage">Learning Language</Label>
                    <Select
                      value={profile?.learning_language || ""}
                      onValueChange={(value) => handleProfileFieldChange("learning_language", value)}
                    >
                      <SelectTrigger id="learningLanguage">
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

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="proficiencyLevel">Proficiency Level</Label>
                    <Select
                      value={profile?.proficiency_level || ""}
                      onValueChange={(value) => handleProfileFieldChange("proficiency_level", value)}
                    >
                      <SelectTrigger id="proficiencyLevel">
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

                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">Streak Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Current Streak</Label>
                      <p className="text-sm">{profile?.streak_count || 0} days</p>
                    </div>
                    <div>
                      <Label>Last Active</Label>
                      <p className="text-sm">
                        {profile?.streak_last_date ? new Date(profile.streak_last_date).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProfile} className="button-hover">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Privacy Settings */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Preferences</CardTitle>
              <CardDescription>
                Control who can see your information and how they can interact with you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showOnlineStatus">Show online status</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow others to see when you're active on the platform
                    </p>
                  </div>
                  <Switch
                    id="showOnlineStatus"
                    checked={privacySettings.showOnlineStatus}
                    onCheckedChange={(value) => handlePrivacyChange("showOnlineStatus", value)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showLastActive">Show last active time</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow others to see when you were last active
                    </p>
                  </div>
                  <Switch
                    id="showLastActive"
                    checked={privacySettings.showLastActive}
                    onCheckedChange={(value) => handlePrivacyChange("showLastActive", value)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowMessages">Allow messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow other users to send you direct messages
                    </p>
                  </div>
                  <Switch
                    id="allowMessages"
                    checked={privacySettings.allowMessages}
                    onCheckedChange={(value) => handlePrivacyChange("allowMessages", value)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="showProfileInSearch">Show profile in search</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow your profile to appear in search results
                    </p>
                  </div>
                  <Switch
                    id="showProfileInSearch"
                    checked={privacySettings.showProfileInSearch}
                    onCheckedChange={(value) => handlePrivacyChange("showProfileInSearch", value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSavePrivacy} className="button-hover">
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Choose which notifications you'd like to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="newMessages">New messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you receive new messages
                    </p>
                  </div>
                  <Switch
                    id="newMessages"
                    checked={notificationSettings.newMessages}
                    onCheckedChange={(value) => handleNotificationChange("newMessages", value)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="profileViews">Profile views</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when someone views your profile
                    </p>
                  </div>
                  <Switch
                    id="profileViews"
                    checked={notificationSettings.profileViews}
                    onCheckedChange={(value) => handleNotificationChange("profileViews", value)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="learningReminders">Learning reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get daily reminders to practice your language
                    </p>
                  </div>
                  <Switch
                    id="learningReminders"
                    checked={notificationSettings.learningReminders}
                    onCheckedChange={(value) => handleNotificationChange("learningReminders", value)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="streakReminders">Streak reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminded to maintain your daily streak
                    </p>
                  </div>
                  <Switch
                    id="streakReminders"
                    checked={notificationSettings.streakReminders}
                    onCheckedChange={(value) => handleNotificationChange("streakReminders", value)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="marketingEmails">Marketing emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features and offers
                    </p>
                  </div>
                  <Switch
                    id="marketingEmails"
                    checked={notificationSettings.marketingEmails}
                    onCheckedChange={(value) => handleNotificationChange("marketingEmails", value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNotifications} className="button-hover">
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account security and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
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
                      {profile?.email || ""}
                    </p>
                  </div>
                  <Button variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Update
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Appearance</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Theme</h4>
                      <p className="text-sm text-muted-foreground">
                        Choose your preferred appearance
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant={theme === "light" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("light")}
                      >
                        <Sun className="h-4 w-4 mr-2" />
                        Light
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("dark")}
                      >
                        <Moon className="h-4 w-4 mr-2" />
                        Dark
                      </Button>
                      <Button
                        variant={theme === "system" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTheme("system")}
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        System
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Subscription</h3>

                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="font-medium">Free Plan</h4>
                      <p className="text-sm text-muted-foreground">
                        You're currently on the free plan
                      </p>
                    </div>
                    <Button>
                      <Wallet className="h-4 w-4 mr-2" />
                      Upgrade
                    </Button>
                  </div>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Basic conversation features
                    </li>
                    <li className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Community access
                    </li>
                    <li className="flex items-center text-muted-foreground">
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Advanced learning tools (Premium)
                    </li>
                    <li className="flex items-center text-muted-foreground">
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      AI-powered conversation practice (Premium)
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" className="text-destructive">
                Delete Account
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;