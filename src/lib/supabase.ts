
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Prepare a unique device identifier for better debugging
const getDeviceId = () => {
  let deviceId = localStorage.getItem('supabase_device_id');
  if (!deviceId) {
    deviceId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    localStorage.setItem('supabase_device_id', deviceId);
  }
  return deviceId;
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: localStorage,
    debug: true, // Enable debug logs from Supabase Auth
    cookieOptions: {
      name: 'sb-auth-token',
      lifetime: 60 * 60 * 24 * 7, // 1 week
      domain: window.location.hostname,
      path: '/',
      sameSite: 'Lax'
    }
  },
  global: {
    headers: {
      'X-Device-ID': getDeviceId(),
      'Accept': 'application/json'
    }
  }
});

export const signInWithGoogle = async () => {
  try {
    console.log("===== INITIATING GOOGLE SIGN-IN =====");

    // Always sign out first to ensure a clean auth state
    await supabase.auth.signOut();

    // Import helpers for PKCE
    const { generateVerifier, storePKCEVerifier, clearPKCEVerifier } = await import('@/utils/pkceHelper');
    
    // Clear any existing verifiers
    clearPKCEVerifier();
    
    // Generate a proper verifier for PKCE
    const verifier = generateVerifier();
    console.log("Generated new verifier:", verifier.substring(0, 5) + "...", "length:", verifier.length);
    
    // Store verifier in all locations
    storePKCEVerifier(verifier);
    
    // Verify storage before continuing
    if (!localStorage.getItem('supabase.auth.code_verifier')) {
      console.error("Critical: Failed to store verifier in localStorage");
      throw new Error("Authentication setup failed");
    }

    // Start OAuth flow
    const result = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    // Double-check verifier after OAuth setup
    console.log("Pre-redirect verification - PKCE verifier exists:", !!localStorage.getItem('supabase.auth.code_verifier'));
    if (!localStorage.getItem('supabase.auth.code_verifier')) {
      // This is a critical failure - attempt emergency recovery
      console.error("Critical: Verifier was removed during OAuth setup");
      
      // Restore from backup if possible
      const backupVerifier = localStorage.getItem('pkce_verifier_backup');
      if (backupVerifier) {
        localStorage.setItem('supabase.auth.code_verifier', backupVerifier);
        console.log("Recovered verifier from backup");
      }
    }

    return result;
  } catch (error) {
    console.error("Error in signInWithGoogle:", error);
    throw error;
  }
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
