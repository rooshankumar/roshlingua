
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Password validation rules
  const PASSWORD_RULES = {
    minLength: 8
  };

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        if (!mounted) return;
        setIsLoading(true);
        console.log("Initializing auth state...");

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Session retrieval error:", error);
          throw error;
        }

        if (!mounted) return;
        console.log("Setting initial session:", session ? "Session exists" : "No session");
        setSession(session);
        setUser(session?.user ?? null);

        // Only proceed with profile check if we have a session
        if (session?.user && mounted) {
          console.log("Checking profile for user:", session.user.id);
          const { data: profileData, error: profileCheckError } = await supabase
            .from('profiles')
            .select('id, onboarding_completed')
            .eq('id', session.user.id)
            .single();

          if (profileCheckError && profileCheckError.code !== 'PGRST116') {
            console.error("Profile check error:", profileCheckError);
            return;
          }

          // Create profile if it doesn't exist
          if (!profileData && mounted) {
            console.log("Creating profile for user:", session.user.id);
            const {error: insertError} = await supabase.from('profiles').upsert({
              id: session.user.id,
              user_id: session.user.id,
              email: session.user.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_seen: new Date().toISOString(),
              onboarding_completed: false
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            });
            
            if (insertError) {
              console.error("Profile creation error:", insertError);
              return;
            }
            if (mounted) {
              window.location.href = '/onboarding';
            }
            return;
          } else {
            // Update last_seen
            console.log("Updating last_seen for user:", session.user.id);
            await supabase
              .from('profiles')
              .update({ last_seen: new Date().toISOString() })
              .eq('id', session.user.id);
            // Check if onboarding is needed
            if (!profileData.onboarding_completed) {
              window.location.href = '/onboarding';
              return;
            }
          }
        }

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            console.log("Auth state changed:", event, currentSession ? "Session exists" : "No session");

            if (mounted) {
              setSession(currentSession);
              setUser(currentSession?.user ?? null);
            }

            if (event === 'SIGNED_IN' && currentSession) {
              try {
                console.log("User signed in, updating profile");
                const { error: profileError } = await supabase
                  .from('profiles')
                  .upsert({ 
                    id: currentSession.user.id,
                    email: currentSession.user.email,
                    updated_at: new Date().toISOString(),
                    last_seen: new Date().toISOString()
                  }, { onConflict: 'id' });

                if (profileError) {
                  console.error("Error updating profile on sign in:", profileError);
                  throw profileError;
                }
              } catch (err) {
                console.error("Error updating profile:", err);
              }
            }
          }
        );

        return () => {
          if (subscription) subscription.unsubscribe();
          mounted = false;
        };

      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mounted) {
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Failed to restore session"
          });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [toast]);

  const login = async (email: string, password: string) => {
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
        throw error;
      }

      // Update last_seen for streak calculation
      if (data.user) {
        const { error: updateError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (updateError) {
          console.error("Error updating last_seen:", updateError);
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      // Validate password
      if (password.length < PASSWORD_RULES.minLength) {
        toast({
          variant: "destructive",
          title: "Invalid password",
          description: `Password must be at least ${PASSWORD_RULES.minLength} characters`
        });
        return;
      }

      // Create the auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (signUpError) {
        console.error("Signup error:", signUpError);
        toast({
          variant: "destructive",
          title: "Signup failed",
          description: signUpError.message
        });
        return;
      }

      toast({
        title: "Account created",
        description: "Please check your email to confirm your account.",
      });
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      // Use production URL for redirects
      const redirectUrl = window.location.hostname.includes('localhost') || window.location.hostname.includes('replit')
        ? `${window.location.origin}/auth/callback`
        : `${window.location.origin.replace(/\/$/, '')}/auth/callback`;

      console.log("Redirect URL for Google auth:", redirectUrl);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error("Google login error:", error);
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: "There was an error with Google authentication."
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear local state
      setUser(null);
      setSession(null);

      // Redirect to auth page
      window.location.href = '/auth';
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

  const updateUserActivity = async (userId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          last_seen: new Date().toISOString() 
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user activity:', error);
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

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    
    if (user?.id && mounted) {
      // Update last_seen on mount
      updateUserActivity(user.id);

      // Update last_seen every 5 minutes while user is active
      interval = setInterval(() => {
        if (mounted) {
          updateUserActivity(user.id);
        }
      }, 5 * 60 * 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [user?.id, mounted]);

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
