
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
    
    // Store verifier in all locations
    storePKCEVerifier(verifier);
    
    // Add additional backup storage with multiple naming patterns for better compatibility
    localStorage.setItem('pkce_verifier_original', verifier);
    sessionStorage.setItem('pkce_verifier_original', verifier);
    localStorage.setItem('code_verifier', verifier);
    sessionStorage.setItem('code_verifier', verifier);
    localStorage.setItem('pkce', verifier);
    sessionStorage.setItem('pkce', verifier);
    
    // Store verifier directly with Supabase key
    localStorage.setItem('supabase.auth.code_verifier', verifier);
    
    // Set robust cookies with longer expiration
    const secure = window.location.protocol === 'https:' ? 'Secure;' : '';
    const domain = window.location.hostname.includes('localhost') ? '' : `domain=${window.location.hostname};`;
    
    document.cookie = `supabase_code_verifier=${verifier};max-age=3600;path=/;SameSite=Lax;${domain}${secure}`;
    document.cookie = `pkce_verifier=${verifier};max-age=3600;path=/;SameSite=Lax;${domain}${secure}`;
    document.cookie = `code_verifier=${verifier};max-age=3600;path=/;SameSite=Lax;${domain}${secure}`;
    
    // Verify all storage locations before continuing
    if (!localStorage.getItem('supabase.auth.code_verifier')) {
      console.error("Critical: Failed to store verifier in localStorage");
      throw new Error("Authentication setup failed");
    }
    
    console.log("PKCE Verifier stored successfully in multiple locations");

    // Store in global window object as last resort backup
    try {
      (window as any).__PKCE_VERIFIER__ = verifier;
      (window as any).pkce_verifier = verifier;
    } catch (e) {
      console.warn("Could not store verifier in window object:", e);
    }

    // Start OAuth flow - ensure we use PKCE
    const result = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: false, // Make sure we don't skip the browser redirect
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          // Add extra parameters to ensure proper PKCE handling
          code_challenge_method: 'S256'
        }
      }
    });

    // Double-check verifier immediately after OAuth setup
    console.log("Pre-redirect verification - PKCE verifier exists:", !!localStorage.getItem('supabase.auth.code_verifier'));
    
    // Final verification and emergency backup
    const finalVerifier = localStorage.getItem('supabase.auth.code_verifier');
    if (!finalVerifier) {
      console.error("Critical: Verifier was removed during OAuth setup");
      
      // Create an emergency HTML5 session storage that persists across redirects
      try {
        sessionStorage.setItem('auth_emergency', JSON.stringify({
          verifier: verifier,
          timestamp: Date.now(),
          device: deviceId
        }));
      } catch (e) {
        console.error("Failed to create emergency backup:", e);
      }
      
      // Restore from any available backup
      const backups = [
        localStorage.getItem('pkce_verifier_backup'),
        localStorage.getItem('pkce_verifier_original'),
        sessionStorage.getItem('pkce_verifier_original'),
        sessionStorage.getItem('supabase.auth.code_verifier'),
        localStorage.getItem('code_verifier'),
        sessionStorage.getItem('code_verifier'),
        (window as any).__PKCE_VERIFIER__,
        (window as any).pkce_verifier
      ];
      
      const validBackup = backups.find(v => v && v.length > 20);
      
      if (validBackup) {
        localStorage.setItem('supabase.auth.code_verifier', validBackup);
        console.log("Recovered verifier from backup");
      } else {
        console.error("All backup verifiers are missing. Authentication will likely fail.");
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
