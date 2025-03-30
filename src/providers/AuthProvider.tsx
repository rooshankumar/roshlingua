import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, createUserRecord } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  login: async () => {},
  signup: async () => {},
  loginWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log("Setting up auth state listener");

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession?.user?.id);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    const getInitialSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error getting session:", error);
          setIsLoading(false);
          return;
        }
        console.log("Initial session:", data.session?.user?.id);
        setSession(data.session);
        setUser(data.session?.user ?? null);
      } catch (error) {
        console.error("Unexpected error getting session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // We now handle setting the user state via the onAuthStateChange listener
    } catch (error) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Please check your credentials and try again.",
      });
      throw error;
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: name,
            email: email
          }
        }
      });

      if (error) {
        console.error("Auth signup error:", error);
        toast({
          variant: "destructive",
          title: "Signup failed",
          description: error.message
        });
        return;
      }

      if (authData.user) {
        // Call RPC function to create user
        const { error: rpcError } = await supabase.rpc('create_user_with_onboarding', {
          new_user_id: authData.user.id,
          new_email: email
        });

        if (rpcError) {
          console.error("User creation error:", rpcError);
          toast({
            variant: "destructive",
            title: "Account creation failed",
            description: "Error creating user profile"
          });
          return;
        }

        toast({
          title: "Account created",
          description: "Please check your email to confirm your account.",
        });
      }
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      // Wait for session to be established
      const maxAttempts = 10;
      let attempts = 0;

      while (attempts < maxAttempts) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
          setUser(session.user);
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    } catch (error) {
      console.error("Google login error:", error);
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: "There was an error with Google authentication.",
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Signout error:", error);
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "There was an error signing out.",
      });
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    login,
    signup,
    loginWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}