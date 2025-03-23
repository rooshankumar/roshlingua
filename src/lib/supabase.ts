
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// These environment variables would be set in your deployment environment
// and during development in a .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Authentication features will not work properly.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// User-related functions
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signUp = async (email: string, password: string) => {
  return await supabase.auth.signUp({ email, password });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const signInWithGoogle = async () => {
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
};

// Mock user authentication for development (remove in production)
export const mockSignIn = (userId: string) => {
  localStorage.setItem('auth_token', 'mock_token');
  localStorage.setItem('mock_user_id', userId);
  return { data: { user: { id: userId } }, error: null };
};
