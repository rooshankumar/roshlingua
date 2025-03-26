
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, createUserRecord } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useLocation } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>; // Keeping for backward compatibility
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  login: async () => {},
  signup: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle routing based on authentication state and onboarding status
  useEffect(() => {
    const checkOnboardingAndRedirect = async () => {
      if (!user || isLoading) return;
      
      try {
        // Only proceed with routing logic if we're not already on auth pages
        if (!location.pathname.includes('/auth')) {
          // Check if onboarding is complete
          const { data: onboardingData, error } = await supabase
            .from('onboarding_status')
            .select('is_complete, current_step')
            .eq('user_id', user.id)
            .maybeSingle(); // Changed from single() to maybeSingle()
            
          if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
            console.error("Error checking onboarding status:", error);
            // Don't return here, proceed with default behavior
          }
          
          // If no onboarding record exists, create one
          if (!onboardingData) {
            try {
              await supabase
                .from('onboarding_status')
                .insert({
                  user_id: user.id,
                  is_complete: false,
                  current_step: 'profile'
                });
                
              // If user is on the home page, redirect to onboarding
              if (location.pathname === '/') {
                navigate('/onboarding', { replace: true });
                return;
              }
            } catch (insertError) {
              console.error("Error creating onboarding record:", insertError);
              // Continue with default behavior
            }
          } else {
            // If user is on the home page, redirect based on onboarding status
            if (location.pathname === '/') {
              if (onboardingData.is_complete) {
                navigate('/dashboard', { replace: true });
              } else {
                navigate('/onboarding', { replace: true });
              }
              return;
            }
            
            // If user needs onboarding but isn't on the onboarding page
            else if (!onboardingData.is_complete && location.pathname !== '/onboarding') {
              navigate('/onboarding', { replace: true });
              return;
            }
          }
        }
      } catch (error) {
        console.error("Error in routing logic:", error);
      }
    };
    
    checkOnboardingAndRedirect();
  }, [user, isLoading, location.pathname, navigate]);

  useEffect(() => {
    console.log("Setting up auth state listener");
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession?.user?.id);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
        
        // If user just signed in, update their online status
        if (event === 'SIGNED_IN' && currentSession?.user) {
          try {
            await supabase
              .from('profiles')
              .upsert({
                id: currentSession.user.id,
                is_online: true,
                updated_at: new Date().toISOString()
              }, { 
                onConflict: 'id',
                ignoreDuplicates: false
              });
          } catch (error) {
            console.error("Error updating online status on sign in:", error);
          }
        }
        
        // If user just signed out, ensure they're marked as offline
        if (event === 'SIGNED_OUT' && user) {
          try {
            await supabase
              .from('profiles')
              .upsert({
                id: user.id,
                is_online: false,
                updated_at: new Date().toISOString()
              }, { 
                onConflict: 'id',
                ignoreDuplicates: false
              });
          } catch (error) {
            console.error("Error updating online status on sign out:", error);
          }
        }
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
        
        // Update online status for the user if logged in
        if (data.session?.user) {
          try {
            await supabase
              .from('profiles')
              .upsert({
                id: data.session.user.id,
                is_online: true,
                updated_at: new Date().toISOString()
              }, { 
                onConflict: 'id',
                ignoreDuplicates: false
              });
          } catch (updateError) {
            console.error("Error updating online status on initial session:", updateError);
          }
        }
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
      
      // Routing will be handled by the useEffect
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;
      
      // Create the user record in the users table
      if (data.user) {
        await createUserRecord(data.user.id, email, name);
      }
      
      toast({
        title: "Account created",
        description: "Your account has been successfully created.",
      });
      
      // Routing will be handled by the useEffect
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error.message || "There was an error creating your account.",
      });
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
      // Routing after OAuth callback will be handled separately
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
  
  const logout = async () => {
    try {
      // Update online status first
      if (user) {
        await supabase
          .from('profiles')
          .update({ is_online: false })
          .eq('id', user.id);
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      
      // Redirect to home page after logout
      navigate('/', { replace: true });
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
    logout,
    signOut: logout, // Alias for backward compatibility
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
