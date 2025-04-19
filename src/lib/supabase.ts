
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing');
}

// Create a single supabase client for the entire app
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit', // Use implicit flow to help with hash fragment tokens
    storageKey: 'sb-auth-token',
    storage: {
      getItem: (key) => {
        try {
          const value = localStorage.getItem(key);
          return value;
        } catch (error) {
          console.error('Error getting auth storage item:', error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          // Clear any existing auth tokens first to avoid conflicts
          if (key === 'sb-auth-token' || key.includes('supabase.auth')) {
            localStorage.removeItem('sb-auth-token');
            localStorage.removeItem('supabase.auth.token');
            sessionStorage.removeItem('supabase.auth.token');
          }
          localStorage.setItem(key, value);
          return;
        } catch (error) {
          console.error('Error setting auth storage item:', error);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
          if (key === 'sb-auth-token') {
            // Also clear related items
            localStorage.removeItem('supabase.auth.token');
            sessionStorage.removeItem('supabase.auth.token');
          }
          return;
        } catch (error) {
          console.error('Error removing auth storage item:', error);
        }
      }
    }
  },
  global: {
    headers: {
      'Accept': 'application/json'
    }
  }
});

// Simple auth helpers
export const signOut = async () => {
  try {
    await supabase.auth.signOut();
    return true;
  } catch (error) {
    console.error("Error signing out:", error);
    return false;
  }
};

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
};

export const getCurrentSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
};

export const signInWithGoogle = async () => {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    }
  });
};
