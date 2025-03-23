import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// These environment variables would be set in your deployment environment
// and during development in a .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Check if we're missing actual Supabase credentials
const isMissingCredentials = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;
if (isMissingCredentials) {
  console.warn('Supabase credentials missing. Using mock authentication for development.');
}

// Create the Supabase client with placeholder values if needed
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// User-related functions
export const getCurrentUser = async () => {
  // If we're using mock auth, get the mock user
  if (isMissingCredentials) {
    const mockUserId = localStorage.getItem('mock_user_id');
    if (mockUserId) {
      return { id: mockUserId } as any;
    }
    return null;
  }
  
  // Otherwise use the real Supabase auth
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const signIn = async (email: string, password: string) => {
  if (isMissingCredentials) {
    // In development with no Supabase, use mock authentication
    if (email === 'user1@example.com' && password === 'password123') {
      return mockSignIn('user1-mock-id');
    } else if (email === 'user2@example.com' && password === 'password123') {
      return mockSignIn('user2-mock-id');
    } else {
      return { data: null, error: { message: 'Invalid email or password' } };
    }
  }
  
  return await supabase.auth.signInWithPassword({ email, password });
};

export const signUp = async (email: string, password: string) => {
  if (isMissingCredentials) {
    // In development with no Supabase, use mock authentication
    return mockSignIn(`new-user-${Date.now()}`);
  }
  
  return await supabase.auth.signUp({ email, password });
};

export const signOut = async () => {
  if (isMissingCredentials) {
    // In development with no Supabase, just clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('mock_user_id');
    localStorage.removeItem('onboarding_complete');
    return { error: null };
  }
  
  return await supabase.auth.signOut();
};

export const signInWithGoogle = async () => {
  if (isMissingCredentials) {
    // In development with no Supabase, use mock authentication
    return mockSignIn(`google-user-${Date.now()}`);
  }
  
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
