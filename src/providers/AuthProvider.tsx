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
  const [authError, setAuthError] = useState<string | null>(null);
  const { toast } = useToast();

  // Password validation rules
  const PASSWORD_RULES = {
    minLength: 8,
    requireNumber: true,
    requireSpecial: true,
    requireUppercase: true
  };

  const validatePassword = (password: string): { isValid: boolean; error: string | null } => {
    if (password.length < PASSWORD_RULES.minLength) {
      return { isValid: false, error: `Password must be at least ${PASSWORD_RULES.minLength} characters` };
    }
    if (PASSWORD_RULES.requireNumber && !/\d/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one number' };
    }
    if (PASSWORD_RULES.requireSpecial && !/[!@#$%^&*]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one special character' };
    }
    if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one uppercase letter' };
    }
    return { isValid: true, error: null };
  };

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

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Update login attempts
        loginAttempts.set(email, {
          count: attempts.count + 1,
          lastAttempt: now
        });

        const attemptsLeft = MAX_LOGIN_ATTEMPTS - (attempts.count + 1);
        toast({
          variant: "destructive",
          title: "Login failed",
          description: `${error.message}${attemptsLeft > 0 ? ` (${attemptsLeft} attempts remaining)` : ''}`
        });
        throw error;
      }

      // Reset login attempts on successful login
      loginAttempts.delete(email);
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
            full_name: name,
            email: email
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

      // Create initial user record with minimal data
      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: email,
            full_name: name, // Basic info from signup
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            onboarding_completed: false // Mark for onboarding flow
          }
        ])
        .single();

      if (userError) {
        console.error("User creation error:", userError);
        toast({
          variant: "destructive",
          title: "Account creation failed",
          description: "Failed to create user record. Please try again."
        });
        await supabase.auth.signOut();
        return;
      }


      if (authData.user) {
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