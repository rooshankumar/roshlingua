import { useState } from "react";
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
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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


const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  const [profileData, setProfileData] = useState({
    name: "Sarah Johnson",
    bio: "Software engineer passionate about learning Spanish for my upcoming trip to Mexico.",
    email: "sarah.johnson@example.com",
    avatar: "/placeholder.svg",
    nativeLanguage: "English",
    learningLanguage: "Spanish",
    proficiencyLevel: "Intermediate (B1)",
  });

  const [privacySettings, setPrivacySettings] = useState({
    showOnlineStatus: true,
    showLastActive: true,
    allowMessages: true,
    showProfileInSearch: true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    newMessages: true,
    profileViews: true,
    learningReminders: true,
    streakReminders: true,
    marketingEmails: false,
  });

  const languages = [
    "English", "Spanish", "French", "German", "Italian",
    "Portuguese", "Chinese", "Japanese", "Korean", "Russian",
    "Arabic", "Hindi", "Turkish", "Dutch", "Swedish"
  ];

  const proficiencyLevels = [
    "Beginner (A1)", "Elementary (A2)", "Intermediate (B1)",
    "Upper Intermediate (B2)", "Advanced (C1)", "Proficient (C2)"
  ];

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

  const handleSaveProfile = () => {
    toast({
      title: "Profile updated",
      description: "Your profile information has been saved.",
    });
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

  const handleChangePassword = () => {
    toast({
      title: "Password change requested",
      description: "We've sent a password reset link to your email.",
    });
  };

  const handleUploadAvatar = () => {
    toast({
      title: "Feature coming soon",
      description: "Avatar upload functionality will be available in the next update.",
    });
  };


  return (
    <div className="container pb-12 animate-fade-in">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <Tabs defaultValue="account">
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
                      <Button variant="outline">
                        <Mail className="h-4 w-4 mr-2" />
                        Update
                      </Button>
                    </div>
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
    </div>
  );
};

export default Settings;