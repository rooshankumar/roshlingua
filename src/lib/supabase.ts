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
    // Ensure redirect URL is properly formatted
    redirectTo: `${window.location.origin}/auth/callback`,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/2.x'
    },
    fetch: (...args) => {
      const request = args[0] as Request;
      if (request && request.url && request.url.includes('auth')) {
        console.log(`Supabase auth request: ${request.method} ${request.url.split('?')[0]}`);
      }

      return fetch(...args).then(response => {
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
  try {
    console.log("===== INITIATING GOOGLE SIGN-IN =====");

    // First, clear any existing auth data to ensure a clean login state
    localStorage.removeItem('supabase.auth.code_verifier');
    await supabase.auth.signOut({ scope: 'local' });

    // Generate a secure code verifier that meets PKCE requirements
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);

    // Convert to base64url encoding (RFC 4648)
    let base64 = '';
    for (let i = 0; i < array.length; i++) {
      base64 += String.fromCharCode(array[i]);
    }
    base64 = btoa(base64);

    // Make URL-safe per RFC 4648 §5
    const codeVerifier = base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
      .substring(0, 64);

    // Store code verifier in LOCAL storage - this is critical
    localStorage.setItem('supabase.auth.code_verifier', codeVerifier);
    console.log("Code verifier stored:", codeVerifier.substring(0, 5) + "...");
    console.log("Code verifier length:", codeVerifier.length);

    // Double-check it was stored properly
    const storedVerifier = localStorage.getItem('supabase.auth.code_verifier');
    if (!storedVerifier || storedVerifier !== codeVerifier) {
      throw new Error("Failed to store code verifier - authentication will fail");
    }

    // Now initiate the OAuth flow with explicit code verifier
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        },
        // Explicitly pass the verifier with the request
        codeVerifier: codeVerifier,
        skipBrowserRedirect: false
      }
    });
  } catch (error) {
    console.error("Error in signInWithGoogle:", error);
    localStorage.removeItem('supabase.auth.code_verifier');
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