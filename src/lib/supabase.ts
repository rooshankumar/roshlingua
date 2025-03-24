
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
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
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
