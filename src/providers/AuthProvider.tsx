import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, createUserRecord } from "@/lib/supabase"; // Assuming this now contains the single Supabase client instance
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

  // Password validation rules
  const PASSWORD_RULES = {
    minLength: 8
  };

  const validatePassword = (password: string): { isValid: boolean; error: string | null } => {
    if (password.length < PASSWORD_RULES.minLength) {
      return { isValid: false, error: `Password must be at least ${PASSWORD_RULES.minLength} characters` };
    }
    return { isValid: true, error: null };
  };

  useEffect(() => {
    // Auth state change handled silently
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
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
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
    const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

    try {
      // Check for rate limiting
      const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
      const now = Date.now();

      if (attempts.count >= MAX_LOGIN_ATTEMPTS && now - attempts.lastAttempt < LOCKOUT_DURATION) {
        const remainingTime = Math.ceil((LOCKOUT_DURATION - (now - attempts.lastAttempt)) / 60000);
        toast({
          variant: "destructive",
          title: "Account locked",
          description: `Too many login attempts. Please try again in ${remainingTime} minutes.`
        });
        return;
      }

      // First check if the user exists
      const { data: userExists } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle specific database errors
        if (error.message.includes('Database error')) {
          console.error('Database error during login:', error);
          toast({
            variant: "destructive",
            title: "Login error",
            description: "There was an issue accessing your account. Please try again in a few moments."
          });
        } else {
          // Update login attempts for other errors
          loginAttempts.set(email, {
            count: attempts.count + 1,
            lastAttempt: now
          });

          const attemptsLeft = MAX_LOGIN_ATTEMPTS - (attempts.count + 1);
          toast({
            variant: "destructive",
            title: "Login failed",
            description: `Invalid credentials${attemptsLeft > 0 ? ` (${attemptsLeft} attempts remaining)` : ''}`
          });
        }
        throw error;
      }

      // Reset login attempts on successful login
      loginAttempts.delete(email);

      // Ensure user record exists
      if (data.user && !userExists) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || '',
            created_at: new Date().toISOString(),
            last_active_at: new Date().toISOString(),
          }]);

        if (profileError) {
          console.error("Error creating user profile:", profileError);
        }
      }
      await updateOnboardingStatus(data.user.id); // Call the new function after successful login
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        toast({
          variant: "destructive",
          title: "Invalid password",
          description: passwordValidation.error
        });
        return;
      }

      // Validate email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast({
          variant: "destructive",
          title: "Invalid email",
          description: "Please enter a valid email address"
        });
        return;
      }

      // First create the auth user
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
        const errorMessage = signUpError.message === 'User already registered'
          ? 'This email is already registered. Please log in instead.'
          : signUpError.message;

        toast({
          variant: "destructive",
          title: "Signup failed",
          description: errorMessage
        });
        return;
      }

      if (!authData.user?.id) {
        toast({
          variant: "destructive",
          title: "Signup failed",
          description: "Failed to create user account"
        });
        return;
      }

      // User record will be created automatically via database trigger
      if (!authData.user) {
        toast({
          variant: "destructive",
          title: "Signup failed",
          description: "There was an error creating your account. Please try again."
        });
        return;
      }

      toast({
        title: "Account created",
        description: "Please check your email to confirm your account.",
      });
      await updateOnboardingStatus(authData.user.id); // Call the new function after successful signup
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            hd: 'domain.com' // Optional: restrict to specific domain
          },
          scopes: 'email profile'
        }
      });

      if (error) {
        console.error("Google auth error:", error);
        toast({
          variant: "destructive",
          title: "Google Authentication Failed",
          description: error.message
        });
        throw error;
      }

      if (!data.url) {
        throw new Error("No OAuth URL returned");
      }

      // Redirect to Google OAuth
      window.location.href = data.url;
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

  const updateOnboardingStatus = async (userId: string) => {
    try {
      const { error: onboardingError } = await supabase
        .from('onboarding_status')
        .update({ is_complete: true })
        .eq('user_id', userId);
      if (onboardingError) {
        console.error("Error updating onboarding status:", onboardingError);
      }
    } catch (error) {
      console.error("Error updating onboarding status:", error);
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