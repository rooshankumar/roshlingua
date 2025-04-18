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
    flowType: 'pkce', // Use PKCE flow for better security
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
    debug: true, // Enable debug logging
    cookieOptions: {
      name: 'sb-auth-token',
      lifetime: 60 * 60 * 8,
      domain: window.location.hostname,
      path: '/',
      sameSite: 'lax'
    },
    pkceTimeout: 60 * 60, // 60 minutes to complete authentication (increased further)
    pkceLeeway: 300, // 5 minutes leeway for clock skew (increased for safety)
    // Ensure clean URL format for callback with correct domain
    redirectTo: window.location.hostname.includes('vercel.app')
      ? 'https://roshlingua.vercel.app/auth/callback' 
      : `${window.location.origin}/auth/callback`,
    // Additional localStorage keys where Supabase might store data
    storageOptions: {
      pkceKey: 'supabase.auth.code_verifier', // Explicitly set PKCE verifier key
    }
  },
  // Enhanced error handling and debug logging
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/2.x'
    },
    fetch: (...args) => {
      // Log the request for debugging
      const request = args[0] as Request;
      if (request && request.url && request.url.includes('auth')) {
        console.log(`Supabase auth request: ${request.method} ${request.url.split('?')[0]}`);
      }
      
      return fetch(...args).then(response => {
        // Log detailed auth response for debugging
        if (response.url && response.url.includes('auth')) {
          console.log(`Supabase auth response: ${response.status} ${response.statusText}`);
          if (!response.ok) {
            console.error(`Supabase auth error: ${response.status} ${response.statusText}`, {
              url: response.url.split('?')[0]
            });
          }
        }
        
        return response;
      }).catch(error => {
        console.error('Supabase fetch error:', error);
        throw error;
      });
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export const signInWithGoogle = async () => {
  const redirectUrl = `${window.location.origin}/auth/callback`;
  
  try {
    console.log("===== INITIATING GOOGLE SIGN-IN =====");
    console.log("Current hostname:", window.location.hostname);
    console.log("Redirect URL:", redirectUrl);
    
    // First, clear any existing code verifiers to avoid conflicts
    Object.keys(localStorage).forEach(key => {
      if (key.includes('code_verifier') || key.includes('verifier')) {
        console.log(`Clearing old verifier key: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    // Generate a cryptographically secure code verifier (43-128 chars)
    const codeVerifier = generateCodeVerifier();
    console.log("Generated code verifier length:", codeVerifier.length);
    console.log("Verifier first 5 chars:", codeVerifier.substring(0, 5));
    
    // Create a unique session ID to identify this specific login attempt
    const sessionId = `google-auth-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    localStorage.setItem('auth_session_id', sessionId);
    console.log("Auth session ID:", sessionId);
    
    // IMPORTANT: Set the PRIMARY code verifier in the official Supabase location
    localStorage.setItem('supabase.auth.code_verifier', codeVerifier);
    
    // Create backup storage locations (but ensure the official one is set first)
    const verifierKeys = [
      'sb-pkce-verifier',             // Alternative key
      `pkce_verifier_${sessionId}`,   // Session-specific key
    ];
    
    // Store backups
    verifierKeys.forEach(key => {
      localStorage.setItem(key, codeVerifier);
      console.log(`Stored backup verifier in '${key}'`);
    });
    
    // Also store verifier in sessionStorage as a fallback
    sessionStorage.setItem('supabase.auth.code_verifier', codeVerifier);
    console.log("Stored verifier in sessionStorage");
    
    // Record timestamp for debugging timing issues
    localStorage.setItem('auth_redirect_time', Date.now().toString());
    
    // Verify primary storage location is set correctly
    const storedVerifier = localStorage.getItem('supabase.auth.code_verifier');
    console.log("PRIMARY VERIFIER CHECK:");
    console.log(`- supabase.auth.code_verifier: length=${storedVerifier?.length || 0}, prefix=${storedVerifier?.substring(0, 5) || 'N/A'}`);
    
    if (!storedVerifier || storedVerifier.length < 43) {
      console.error("WARNING: Code verifier not properly stored before redirect!");
      // Emergency recovery
      const backupVerifier = sessionStorage.getItem('supabase.auth.code_verifier');
      if (backupVerifier && backupVerifier.length >= 43) {
        localStorage.setItem('supabase.auth.code_verifier', backupVerifier);
        console.log("Recovered verifier from sessionStorage");
      }
    }
    
    // Add verification of storage event listeners
    const storageHandler = (e) => {
      if (e.key === 'supabase.auth.code_verifier') {
        console.log("Storage event detected on code_verifier", e.newValue ? "set" : "removed");
      }
    };
    window.addEventListener('storage', storageHandler);
    
    // Initiate OAuth flow with explicit code verifier
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${redirectUrl}?session_id=${sessionId}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        },
        codeVerifier: codeVerifier,
        skipBrowserRedirect: false
      }
    });
  } catch (error) {
    console.error("Error in signInWithGoogle:", error);
    throw error;
  }
};

// Helper function to generate a robust random string for the code verifier
// Following RFC 7636 PKCE specifications
function generateCodeVerifier() {
  // Generate random bytes (using 64 bytes for strong security)
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  
  // Convert to base64url encoding (RFC 4648)
  // Use a more robust approach to avoid potential issues with apply() and large arrays
  let base64 = '';
  for (let i = 0; i < array.length; i++) {
    base64 += String.fromCharCode(array[i]);
  }
  base64 = btoa(base64);
  
  // Make URL-safe by replacing characters per RFC 4648 §5
  const urlSafe = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  // Ensure length is between 43-128 characters per OAuth PKCE spec (RFC 7636)
  // We'll keep it to 64 characters which is secure but not excessively long
  const verifier = urlSafe.substring(0, 64);
  
  // Final validation - should match ^[A-Za-z0-9-._~]{43,128}$ per RFC 7636
  const validPKCEPattern = /^[A-Za-z0-9\-._~]{43,128}$/;
  if (!validPKCEPattern.test(verifier)) {
    console.error("Generated verifier doesn't match PKCE pattern! Retrying...");
    return generateCodeVerifier(); // Recursively retry if invalid
  }
  
  return verifier;
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