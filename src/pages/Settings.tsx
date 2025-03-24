import { useState } from "react";
import { LogOut, Wallet } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [notificationSettings, setNotificationSettings] = useState({
    newMessages: true,
    profileViews: true,
    learningReminders: true
  });

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <Tabs defaultValue="notifications">
        <TabsList className="mb-4">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">New Messages</h3>
                  <p className="text-sm text-muted-foreground">Get notified when you receive new messages</p>
                </div>
                <Switch 
                  checked={notificationSettings.newMessages}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({...prev, newMessages: checked}))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Profile Views</h3>
                  <p className="text-sm text-muted-foreground">Get notified when someone views your profile</p>
                </div>
                <Switch 
                  checked={notificationSettings.profileViews}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({...prev, profileViews: checked}))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Learning Reminders</h3>
                  <p className="text-sm text-muted-foreground">Receive daily reminders to practice</p>
                </div>
                <Switch 
                  checked={notificationSettings.learningReminders}
                  onCheckedChange={(checked) => 
                    setNotificationSettings(prev => ({...prev, learningReminders: checked}))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Subscription</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="font-medium">Free Plan</h4>
                      <p className="text-sm text-muted-foreground">You're currently on the free plan</p>
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
              <Button variant="outline" className="text-destructive">Delete Account</Button>
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