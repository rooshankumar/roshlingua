import { createContext, useContext, useEffect, useState } from "react";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { User } from "@/lib/database.types";

interface AuthContextType {
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  completeOnboarding: () => void;
}

const defaultContext: AuthContextType = {
  isAuthenticated: false,
  isOnboardingComplete: false,
  isLoading: true,
  user: null,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  loginWithGoogle: async () => {},
  completeOnboarding: () => {},
};

const AuthContext = createContext<AuthContextType>(defaultContext);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      
      try {
        // For demo/development without Supabase connected:
        const token = localStorage.getItem("auth_token");
        if (token) {
          setIsAuthenticated(true);
          
          const onboardingStatus = localStorage.getItem("onboarding_complete");
          setIsOnboardingComplete(!!onboardingStatus);
          
          // Try to get actual user if available
          const currentUser = await getCurrentUser();
          if (currentUser) {
            // If we have a real user from Supabase, use that
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', currentUser.id)
              .single();
              
            if (data && !error) {
              setUser(data);
            }
          } else {
            // Otherwise use mock data for development
            const mockUserId = localStorage.getItem("mock_user_id");
            if (mockUserId) {
              const { data } = await supabase
                .from('users')
                .select('*')
                .eq('id', mockUserId)
                .single();
                
              if (data) {
                setUser(data);
              }
            }
          }
        } else {
          setIsAuthenticated(false);
          setIsOnboardingComplete(false);
          setUser(null);
        }
      } catch (error) {
        console.error("Auth status check error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
    
    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setIsAuthenticated(true);
          localStorage.setItem("auth_token", session.access_token);
          
          // Check if onboarding is complete
          const { data } = await supabase
            .from('onboarding_status')
            .select('is_complete')
            .eq('user_id', session.user.id)
            .single();
            
          setIsOnboardingComplete(data?.is_complete || false);
          
          // Get user data
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (userData) {
            setUser(userData);
            
            // Update last login
            await supabase
              .from('users')
              .update({ last_login: new Date().toISOString() })
              .eq('id', session.user.id);
              
            // Check and update streak
            // ... streak logic would go here
          }
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setIsOnboardingComplete(false);
          setUser(null);
          localStorage.removeItem("auth_token");
          localStorage.removeItem("onboarding_complete");
          localStorage.removeItem("mock_user_id");
        }
      }
    );
    
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);
  
  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };
  
  const signup = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };
  
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // For demo purposes
      localStorage.removeItem("auth_token");
      localStorage.removeItem("onboarding_complete");
      localStorage.removeItem("mock_user_id");
      setIsAuthenticated(false);
      setIsOnboardingComplete(false);
      setUser(null);
      
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };
  
  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
      
    } catch (error) {
      console.error("Google login error:", error);
      throw error;
    }
  };
  
  const completeOnboarding = async () => {
    // For demo purposes
    localStorage.setItem("onboarding_complete", "true");
    setIsOnboardingComplete(true);
    
    // If we have a real user, update onboarding status
    const currentUser = await getCurrentUser();
    if (currentUser) {
      await supabase
        .from('onboarding_status')
        .upsert({
          user_id: currentUser.id,
          is_complete: true,
          current_step: 'completed',
          updated_at: new Date().toISOString(),
        });
    }
  };
  
  const value = {
    isAuthenticated,
    isOnboardingComplete,
    isLoading,
    user,
    login,
    signup,
    logout,
    loginWithGoogle,
    completeOnboarding,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
