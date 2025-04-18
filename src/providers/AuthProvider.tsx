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
    let mounted = true;

    async function initializeAuth() {
      try {
        setIsLoading(true);
        console.log("Initializing auth state...");

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Session retrieval error:", error);
          throw error;
        }

        if (mounted) {
          console.log("Setting initial session:", session ? "Session exists" : "No session");
          setSession(session);
          setUser(session?.user ?? null);

          // If session exists, ensure profile exists
          if (session?.user) {
            console.log("Checking profile for user:", session.user.id);
            const { data: profileData, error: profileCheckError } = await supabase
              .from('profiles')
              .select('id, onboarding_completed')
              .eq('id', session.user.id)
              .single();

            if (profileCheckError && profileCheckError.code !== 'PGRST116') {
              console.error("Profile check error:", profileCheckError);
            }

            // Create profile if it doesn't exist
            if (!profileData) {
              console.log("Creating profile for user:", session.user.id);
              await supabase.from('profiles').insert({
                id: session.user.id,
                email: session.user.email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_seen: new Date().toISOString(),
                onboarding_completed: false
              });
            } else {
              // Update last_seen
              console.log("Updating last_seen for user:", session.user.id);
              await supabase
                .from('profiles')
                .update({ last_seen: new Date().toISOString() })
                .eq('id', session.user.id);
            }
          }
        }

        // Listen for auth changes
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
          mounted = false;
          subscription.unsubscribe();
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
      if (data.user) {
        // Update last_seen for streak calculation
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
        await handlePostAuth(data.user.id);
      }
      await updateOnboardingStatus(data.user.id); // Call the new function after successful login
      await updateUserActivity(data.user.id); // Add streak update after successful login
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
        let errorMessage = 'Failed to create account. Please try again.';

        if (signUpError.message === 'User already registered') {
          errorMessage = 'This email is already registered. Please log in instead.';
        } else if (signUpError.message.includes('Database error')) {
          errorMessage = 'There was an issue creating your account. Please try again in a few moments.';
          // Log detailed error for debugging
          console.error('Database error during signup:', signUpError);
        }

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
      await updateUserActivity(authData.user.id); // Add streak update after successful signup
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      console.log("===== INITIATING GOOGLE LOGIN =====");

      // Clear previous verifier data and auth errors
      localStorage.removeItem('auth_error_type');
      localStorage.removeItem('auth_error_message');

      // Handle the login using the centralized function in supabase.ts
      const result = await signInWithGoogle();

      if (!result.data?.url) {
        throw new Error("No OAuth URL returned");
      }

      // Additional application-specific logic before redirect
      console.log("Received OAuth URL successfully");

      // Ensure code verifier is properly stored before redirect
      const finalVerifier = localStorage.getItem('supabase.auth.code_verifier');
      console.log("FINAL REDIRECT CHECK - code verifier exists:", !!finalVerifier);

      if (finalVerifier) {
        console.log("Verifier length:", finalVerifier.length);
        console.log("Verifier prefix:", finalVerifier.substring(0, 5) + "...");

        // Make 100% sure verifier is also in sessionStorage as backup
        sessionStorage.setItem('supabase.auth.code_verifier', finalVerifier);

        // Store verifier in cookie as last resort backup (expires in 10 minutes)
        document.cookie = `pkce_verifier=${finalVerifier};max-age=600;path=/;SameSite=Lax`;

        // For debugging/monitoring
        console.log("Stored verifier backup in multiple locations:");
        console.log("- localStorage: OK");
        console.log("- sessionStorage: OK");
        console.log("- cookie: OK (expires in 10 min)");
        console.log("Verifier value (first 5 chars):", finalVerifier.substring(0, 5) + "...");
        console.log("Verifier length:", finalVerifier.length);
      } else {
        console.error("CRITICAL: No code verifier found before redirect!");

        // Emergency recovery - check if our function stored it elsewhere
        const sessionId = localStorage.getItem('auth_session_id');
        if (sessionId) {
          const backupVerifier = localStorage.getItem(`pkce_verifier_${sessionId}`);
          if (backupVerifier) {
            console.log("Found backup verifier, restoring to standard location");
            localStorage.setItem('supabase.auth.code_verifier', backupVerifier);
            sessionStorage.setItem('supabase.auth.code_verifier', backupVerifier);
            // Also in cookie
            document.cookie = `pkce_verifier=${backupVerifier};max-age=600;path=/;SameSite=Lax`;
          } else {
            // Try other backup locations
            const alternateVerifier = localStorage.getItem('sb-pkce-verifier');
            if (alternateVerifier) {
              console.log("Found alternate verifier, restoring to standard location");
              localStorage.setItem('supabase.auth.code_verifier', alternateVerifier);
              sessionStorage.setItem('supabase.auth.code_verifier', alternateVerifier);
              document.cookie = `pkce_verifier=${alternateVerifier};max-age=600;path=/;SameSite=Lax`;
            } else {
              console.error("All recovery attempts failed. Authentication likely to fail.");
              // Create a new verifier as last resort
              const emergencyVerifier = Math.random().toString(36).substring(2) + 
                Math.random().toString(36).substring(2) + 
                Math.random().toString(36).substring(2) + 
                Math.random().toString(36).substring(2);
              localStorage.setItem('supabase.auth.code_verifier', emergencyVerifier);
              sessionStorage.setItem('supabase.auth.code_verifier', emergencyVerifier);
              document.cookie = `pkce_verifier=${emergencyVerifier};max-age=600;path=/;SameSite=Lax`;
              console.log("Created emergency verifier as last resort");
            }
          }
        }
      }

      console.log("Redirecting to Google auth...");

      // Perform redirect
      window.location.href = result.data.url;
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

  // We don't need this separate function anymore, it's inlined in loginWithGoogle

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear any local state
      setUser(null);
      setSession(null);

      // Force navigation to auth page
      window.location.href = '/auth';

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

  const handlePostAuth = async (userId: string) => {
    const { data: onboardingStatus, error: onboardingError } = await supabase
      .from('onboarding_status')
      .select('is_complete')
      .eq('user_id', userId)
      .single();

    if (onboardingError) {
      console.error("Error checking onboarding status:", onboardingError);
      return;
    }

    if (onboardingStatus && onboardingStatus.is_complete) {
      window.location.href = '/dashboard'; // Redirect to dashboard if onboarding is complete
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
    if (user?.id) {
      // Update last_seen on mount
      updateUserActivity(user.id);

      // Update last_seen every 5 minutes while user is active
      const interval = setInterval(() => {
        updateUserActivity(user.id);
      }, 5 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [user?.id]);

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