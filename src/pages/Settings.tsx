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
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface SettingsProps {
  onLogout: () => void;
}

const Settings = ({ onLogout }: SettingsProps) => {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [profileData, setProfileData] = useState({
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    bio: "Software engineer passionate about learning Spanish for my upcoming trip to Mexico.",
  });

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your settings have been saved successfully.",
    });
  };

  return (
    <div className="container max-w-4xl animate-fade-in py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6">
          {/* Profile Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="/placeholder.svg" alt={profileData.name} />
                  <AvatarFallback>{profileData.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <Button variant="outline">Change Avatar</Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <Label htmlFor="name">Full Name</Label>
                  </div>
                  <Input id="name" value={profileData.name} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <Label htmlFor="email">Email</Label>
                  </div>
                  <Input id="email" type="email" value={profileData.email} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <Label htmlFor="bio">Bio</Label>
                  </div>
                  <Textarea id="bio" value={profileData.bio} rows={3} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4">Language Settings</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Native Language</Label>
                  <Select defaultValue="english">
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Learning Language</Label>
                  <Select defaultValue="spanish">
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences Section */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium mb-4">Preferences</h3>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <Label>Notifications</Label>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {theme === "dark" ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4" />
                    )}
                    <Label>Dark Mode</Label>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) =>
                      setTheme(checked ? "dark" : "light")
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="destructive" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;