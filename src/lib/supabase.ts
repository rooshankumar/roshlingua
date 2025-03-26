
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://yekzyvdjjozhhatdefsq.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlla3p5dmRqam96aGhhdGRlZnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDk5NjEsImV4cCI6MjA1ODI4NTk2MX0.6z2QW9PnENnT9knd9oK8Sbqf2JhN1NsKIKs6hG4vM8Q";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const signInWithGoogle = async () => {
  const redirectUrl = window.location.origin + '/auth/callback';
  
  console.log("Redirecting to Google OAuth with redirectUrl:", redirectUrl);
  
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

// Helper function to get current session
export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error getting session:", error);
    return null;
  }
  return data.session;
};

// Helper function to get current user
export const getCurrentUser = async () => {
  const session = await getCurrentSession();
  return session?.user || null;
};

// Function to create user record manually in the users table
export const createUserRecord = async (userId: string, email: string, fullName: string) => {
  try {
    // Call the create_user_with_onboarding function to properly set up the user
    const { data, error } = await supabase.rpc('create_user_with_onboarding', {
      p_user_id: userId,
      p_email: email,
      p_full_name: fullName
    });
    
    if (error) {
      console.error("Failed to create user record:", error);
      
      // Fallback: Try direct insert if RPC fails
      try {
        // 1. Try to insert into users table first
        const usersInsert = await supabase
          .from('users')
          .insert({
            id: userId,
            email: email,
            full_name: fullName,
            native_language: 'English',
            learning_language: 'Spanish',
            proficiency_level: 'beginner'
          })
          .select();
          
        if (usersInsert.error) throw usersInsert.error;
        
        // 2. Then insert into profiles
        const profilesInsert = await supabase
          .from('profiles')
          .insert({
            id: userId
          })
          .select();
          
        if (profilesInsert.error) throw profilesInsert.error;
        
        // 3. Finally insert into onboarding_status
        const onboardingInsert = await supabase
          .from('onboarding_status')
          .insert({
            user_id: userId,
            is_complete: false
          })
          .select();
          
        if (onboardingInsert.error) throw onboardingInsert.error;
        
        console.log("Created user record through fallback method");
        return true;
      } catch (fallbackError) {
        console.error("Fallback user creation also failed:", fallbackError);
        return false;
      }
    }
    
    console.log("Created user record successfully:", data);
    return true;
  } catch (error) {
    console.error("Error in createUserRecord:", error);
    return false;
  }
};
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
