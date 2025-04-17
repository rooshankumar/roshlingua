import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
    debug: true,
    cookieOptions: {
      name: 'sb-auth-token',
      lifetime: 60 * 60 * 8,
      domain: window.location.hostname,
      path: '/',
      sameSite: 'lax'
    }
  }
});

export const signInWithGoogle = async () => {
  const redirectUrl = `${window.location.origin}/auth/callback`;
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error getting session:", error);
    return null;
  }
  return data.session;
};

export const getCurrentUser = async () => {
  const session = await getCurrentSession();
  return session?.user || null;
};

export const createUserRecord = async (userId: string, email: string, fullName: string) => {
  try {
    const { data, error } = await supabase.rpc('create_user_with_onboarding', {
      p_user_id: userId,
      p_email: email,
      p_full_name: fullName
    });

    if (error) {
      console.error("Failed to create user record:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Exception creating user record:", err);
    return { success: false, error: err };
  }
};