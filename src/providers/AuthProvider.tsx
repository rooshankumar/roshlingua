import { createContext, useCallback, useContext, useEffect, useState, useRef } from "react";
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
  refreshSubscriptions: () => void; // Added refreshSubscriptions
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  login: async () => {},
  signup: async () => {},
  loginWithGoogle: async () => {},
  signOut: async () => {},
  refreshSubscriptions: () => {} // Added refreshSubscriptions
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
                user_id: session.user.id, // Add user_id field
                email: session.user.email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_seen: new Date().toISOString(),
                onboarding_completed: false,
                learning_language: 'en', // Default to English
                native_language: 'en',   // Default to English
                proficiency_level: 'beginner' // Default to beginner
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
                    user_id: currentSession.user.id, // Add user_id field
                    email: currentSession.user.email,
                    updated_at: new Date().toISOString(),
                    last_seen: new Date().toISOString(),
                    learning_language: 'en', // Default to English
                    native_language: 'en',   // Default to English
                    proficiency_level: 'beginner' // Default to beginner
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
            updated_at: new Date().toISOString(),
            learning_language: 'en', // Default value for required field
            native_language: 'en',   // Default value for required field
            proficiency_level: 'beginner' // Default value for required field
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

      // Import PKCE helper function
      const { generateVerifier } = await import('@/utils/pkceHelper');

      // Explicitly generate a verifier before OAuth flow
      const verifier = generateVerifier();
      console.log("Generated new PKCE verifier:", verifier.substring(0, 5) + '...');

      // Store it in localStorage where Supabase expects it
      localStorage.setItem('supabase.auth.code_verifier', verifier);

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
      // Set user's online status to false before signing out
      if (user?.id) {
        console.log("Setting user offline status before logout");
        await supabase
          .from('profiles')
          .update({ 
            is_online: false,
            last_seen: new Date().toISOString() 
          })
          .eq('id', user.id);
      }

      //Clean up subscriptions before signing out
      subscriptionManager.cleanup();
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

  const refreshSubscriptions = () => {
    // Don't refresh if no user is logged in
    if (!user?.id) {
      console.log('No user logged in, skipping subscription refresh');
      return;
    }

    console.log('Refreshing all real-time subscriptions');
    // Debounce refresh operations to prevent multiple rapid refreshes
    if (refreshSubscriptionTimer.current) {
      clearTimeout(refreshSubscriptionTimer.current);
    }

    refreshSubscriptionTimer.current = setTimeout(() => {
      subscriptionManager.refreshAll();

      // Also update the user's online status when refreshing
      try {
        supabase
          .from('profiles')
          .select('learning_language, native_language, proficiency_level')
          .eq('id', user.id)
          .single()
          .then(({ data, error: selectError }) => {
            if (selectError) {
              console.error('Error getting profile data:', selectError);
              return;
            }

            // Use existing values or defaults
            const learning_language = data?.learning_language || 'en';
            const native_language = data?.native_language || 'en';
            const proficiency_level = data?.proficiency_level || 'beginner';

            // Update with all required fields
            supabase
              .from('profiles')
              .update({ 
                is_online: true,
                last_seen: new Date().toISOString(),
                learning_language,
                native_language,
                proficiency_level
              })
              .eq('id', user.id)
              .then(({ error }) => {
                if (error) {
                  console.error('Error updating online status during refresh:', error);
                }
              });
          });
      } catch (err) {
        console.error('Failed to update online status during refresh:', err);
      }

      refreshSubscriptionTimer.current = null;
    }, 300);
  };

  // Setup session refresh to handle auth token expiration
  useEffect(() => {
    if (!user) return;

    // Set up a periodic session refresh to prevent token expiration
    const sessionRefreshInterval = setInterval(async () => {
      try {
        // Attempt to refresh the session
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('Session refresh error:', error);
        } else {
          console.log('Session refreshed successfully');
        }
      } catch (err) {
        console.error('Error in session refresh:', err);
      }
    }, 30 * 60 * 1000); // Refresh every 30 minutes

    return () => {
      clearInterval(sessionRefreshInterval);
    };
  }, [user]);

  // Add a ref to store the timer
  const refreshSubscriptionTimer = useRef<NodeJS.Timeout | null>(null);

  // Handle auth state changes
  // const handleAuthStateChange = useCallback(
  //     async (event: AuthChangeEvent, session: Session | null) => {
  //         console.log('Auth state changed:', event, session ? 'User logged in' : 'No session');

  //         if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
  //             if (session?.user) {
  //                 setUser(session.user);
  //                 setLoading(false);
  //             }
  //         } else if (event === 'SIGNED_OUT') {
  //             setUser(null);
  //             setLoading(false);
  //         } else if (event === 'USER_UPDATED') {
  //             if (session?.user) {
  //                 setUser(session.user);
  //             }
  //         }
  //     },
  //     []
  // );
  useEffect(() => {
    console.log('🔄 Initializing auth state...');

    // Get initial session with better debugging
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('🔍 Initial session check:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userEmail: session?.user?.email,
        sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A'
      });

      if (error) {
        console.error('❌ Error getting initial session:', error);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Check if session is expired
      if (session && session.expires_at) {
        const isExpired = (session.expires_at * 1000) < Date.now();
        if (isExpired) {
          console.warn('⚠️ Session is expired, clearing auth state');
          setUser(null);
          setIsLoading(false);
          return;
        }
      }

      setUser(session?.user ?? null);
      setIsLoading(false);
    });
  }, []);


  const handleAuthStateChange = useCallback(
    async (event: any, session: Session | null) => {
      console.log('🔄 Auth state changed:', {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
        userEmail: session?.user?.email,
        timestamp: new Date().toISOString()
      });

      // Handle different auth events
      switch (event) {
        case 'SIGNED_IN':
          console.log('✅ User signed in successfully');
          break;
        case 'SIGNED_OUT':
          console.log('👋 User signed out');
          break;
        case 'TOKEN_REFRESHED':
          console.log('🔄 Token refreshed');
          break;
        case 'USER_UPDATED':
          console.log('👤 User updated');
          break;
        case 'PASSWORD_RECOVERY':
          console.log('🔐 Password recovery');
          break;
        default:
          console.log('📝 Auth event:', event);
      }

      setUser(session?.user ?? null);
      setIsLoading(false);
    },
    []
  );


  const value: AuthContextType = {
    user,
    session,
    isLoading,
    login,
    signup,
    loginWithGoogle,
    signOut,
    refreshSubscriptions, // Added refreshSubscriptions
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

// Import the actual subscription manager
import subscriptionManager from '@/utils/subscriptionManager';

const updateProfileOnSignIn = async (user: User) => {
  // Create or update the profile with basic user info
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        user_id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        learning_language: 'en', // Default to English if not provided
      }, { onConflict: 'id' });

    if (error) {
      console.error('Error updating profile on sign in:', error);
    }
  } catch (error) {
    console.error('Error updating profile:', error);
  }
};