import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  

  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message
        });
        return;
      }

      if (data?.user) {
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login error",
        description: "An unexpected error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (password !== confirmPassword) {
        toast({
          variant: "destructive",
          title: "Passwords do not match",
          description: "Please make sure your passwords match.",
        });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Signup failed",
          description: error.message
        });
        return;
      }

      if (data?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            username: email.split('@')[0],
            bio: '',
            likes_count: 0,
            is_online: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (profileError) {
          console.error("Profile creation error:", profileError);
          toast({
            variant: "destructive",
            title: "Profile creation failed",
            description: "Failed to create user profile"
          });
          return;
        }

        toast({
          title: "Account created",
          description: "Please check your email to verify your account.",
        });
        navigate("/auth", { replace: true });
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        variant: "destructive",
        title: "Signup error",
        description: "An unexpected error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full animate-scale-in shadow-lg max-w-md mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <form onSubmit={handleLogin}>
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>
                Sign in to your roshLingua account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com" 
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-0 h-full px-3 py-1"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>

        <TabsContent value="signup">
          <form onSubmit={handleSignup}>
            <CardHeader>
              <CardTitle>Create an account</CardTitle>
              <CardDescription>
                Enter your details to create your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="space-y-2">
                <Label htmlFor="email-signup">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    id="email-signup" 
                    type="email" 
                    placeholder="name@example.com" 
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Password</Label>
                <div className="relative">
                  <Input 
                    id="password-signup" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    className="pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-0 h-full px-3 py-1"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default Auth;