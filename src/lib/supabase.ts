
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
    storageKey: 'sb-auth-token', // Use consistent key for storage
    debug: true, // Enable debug logs from Supabase Auth
    cookieOptions: {
      name: 'sb-auth-token',
      lifetime: 60 * 60 * 24 * 7, // 1 week
      domain: window.location.hostname,
      path: '/',
      sameSite: 'Lax'
    },
    // Create custom storage that writes to both localStorage and sessionStorage
    storage: {
      getItem: (key) => {
        const item = localStorage.getItem(key) || sessionStorage.getItem(key);
        return item;
      },
      setItem: (key, value) => {
        localStorage.setItem(key, value);
        sessionStorage.setItem(key, value);
        
        // For verifier specifically, also set a cookie 
        if (key === 'supabase.auth.code_verifier') {
          const secure = window.location.protocol === 'https:' ? 'Secure;' : '';
          document.cookie = `pkce_verifier=${value};max-age=3600;path=/;SameSite=Lax;${secure}`;
        }
        return value;
      },
      removeItem: (key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
        
        // For verifier specifically, clear the cookie too
        if (key === 'supabase.auth.code_verifier') {
          document.cookie = 'pkce_verifier=;max-age=0;path=/;';
        }
      }
    }
  },
  global: {
    headers: {
      'X-Device-ID': getDeviceId(),
      'Accept': '*/*', // Accept any content type to avoid 406 errors
      'Content-Type': 'application/json'
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
    
    // Clear any existing verifiers (important for clean state)
    clearPKCEVerifier();
    
    // Generate a proper verifier for PKCE
    const verifier = generateVerifier();
    console.log("Generated new verifier:", verifier.substring(0, 5) + "...", "length:", verifier.length);
    
    // Store the device ID with the verifier to help debugging
    const deviceId = getDeviceId();
    localStorage.setItem('pkce_session_device', deviceId);
    
    // Store in ALL possible locations
    storePKCEVerifier(verifier);
    
    // Create a state parameter to carry the verifier through the OAuth flow
    // This is a non-standard but effective approach used by some implementations
    const stateData = {
      verifier: verifier,
      timestamp: Date.now(),
      device: deviceId
    };
    
    const stateParam = btoa(JSON.stringify(stateData));
    
    // Verify storage before continuing
    if (!localStorage.getItem('supabase.auth.code_verifier')) {
      console.error("Critical: Failed to store verifier in localStorage");
      
      // Emergency fix - force store again with direct approach
      localStorage.setItem('supabase.auth.code_verifier', verifier);
      
      if (!localStorage.getItem('supabase.auth.code_verifier')) {
        throw new Error("Authentication setup failed - storage is not working");
      }
    }
    
    console.log("PKCE Verifier stored successfully in multiple locations");
    
    // Create a hidden form field as an extra backup (preserved during page navigation)
    try {
      let backupInput = document.getElementById('pkce-backup') as HTMLInputElement;
      if (!backupInput) {
        backupInput = document.createElement('input');
        backupInput.type = 'hidden';
        backupInput.id = 'pkce-backup';
        document.body.appendChild(backupInput);
      }
      backupInput.value = verifier;
    } catch (e) {
      console.warn("Could not create backup input field:", e);
    }

    // Start OAuth flow - ensure we use PKCE
    const result = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: false,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          code_challenge_method: 'S256',
          state: stateParam // Pass verifier in state parameter as backup
        }
      }
    });

    // Double-check verifier immediately after OAuth setup
    const checkVerifier = localStorage.getItem('supabase.auth.code_verifier');
    console.log("Pre-redirect verification - PKCE verifier exists:", !!checkVerifier);
    
    if (!checkVerifier) {
      console.error("Critical: Verifier was removed during OAuth setup");
      
      // Last-ditch attempt to restore the verifier
      localStorage.setItem('supabase.auth.code_verifier', verifier);
      sessionStorage.setItem('supabase.auth.code_verifier', verifier);
      
      // Set cookies again with max compatibility
      document.cookie = `pkce_verifier=${verifier};max-age=3600;path=/;SameSite=Lax`;
      document.cookie = `code_verifier=${verifier};max-age=3600;path=/;SameSite=Lax`;
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
