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
    },
    // Ensure these are set correctly
    pkceTimeout: 5 * 60, // 5 minutes to complete authentication
    pkceLeeway: 30 // 30 second leeway for clock skew
  }
});

export const signInWithGoogle = async () => {
  const redirectUrl = `${window.location.origin}/auth/callback`;
  
  try {
    // Generate a random string for PKCE code verifier
    const codeVerifier = generateCodeVerifier();
    console.log("Generated code verifier length:", codeVerifier.length);
    
    // Store it in localStorage - critically important for PKCE flow
    localStorage.setItem('supabase.auth.code_verifier', codeVerifier);
    
    // Log storage for debugging
    const storedVerifier = localStorage.getItem('supabase.auth.code_verifier');
    console.log("Stored code verifier exists:", !!storedVerifier);
    console.log("Stored code verifier length:", storedVerifier?.length || 0);
    
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        },
        // Make sure to pass the code verifier when initiating the OAuth flow
        codeVerifier,
        skipBrowserRedirect: false
      }
    });
  } catch (error) {
    console.error("Error in signInWithGoogle:", error);
    throw error;
  }
};

// Helper function to generate a random string for the code verifier
// Using a more robust method recommended by Supabase
function generateCodeVerifier() {
  const array = new Uint8Array(56);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, [...array]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

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