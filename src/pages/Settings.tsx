
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Cog, User, Lock, Palette, LogOut, ChevronRight,
  Moon, Sun, Monitor, Smartphone, Globe, Bell, Shield
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { signOut } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  const [theme, setTheme] = useState<string>("light");

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Theme Preference</h3>
      <RadioGroup
        defaultValue={theme}
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
      id: "device",
      title: "Device Settings",
      description: "Manage device-specific preferences",
      icon: <Smartphone className="h-5 w-5 text-primary" />,
    }
  ];

  const renderSelectedSettings = () => {
    switch (selectedSetting) {
      case "appearance":
        return <ThemeSelector />;
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
