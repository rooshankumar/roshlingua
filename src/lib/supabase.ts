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
    storage: {
      getItem: (key) => {
        const value = localStorage.getItem(key);
        console.log(`[Storage] GET ${key} => ${value ? 'value exists' : 'null'}`);
        return value;
      },
      setItem: (key, value) => {
        console.log(`[Storage] SET ${key} => ${value ? 'value exists' : 'null'}`);
        localStorage.setItem(key, value);
        // For critical PKCE values, redundantly store in multiple locations
        if (key === 'supabase.auth.code_verifier' && value) {
          sessionStorage.setItem(key, value);
          document.cookie = `pkce_verifier=${value};max-age=600;path=/;SameSite=Lax`;
          localStorage.setItem('sb-pkce-verifier', value); 
        }
      },
      removeItem: (key) => {
        console.log(`[Storage] REMOVE ${key}`);
        localStorage.removeItem(key);
        // Also remove from backup locations for PKCE values
        if (key === 'supabase.auth.code_verifier') {
          sessionStorage.removeItem(key);
          document.cookie = 'pkce_verifier=; max-age=0; path=/;';
          localStorage.removeItem('sb-pkce-verifier');
        }
      },
    },
    storageKey: 'supabase.auth.token',
    debug: true,
    cookieOptions: {
      name: 'sb-auth-token',
      lifetime: 60 * 60 * 8,
      domain: window.location.hostname,
      path: '/',
      sameSite: 'lax'
    },
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

    // First, clear any existing auth data
    await supabase.auth.signOut({ scope: 'local' });

    // Import PKCE helper
    const { setupPKCEVerifier } = await import('@/utils/pkceHelper');

    // Generate and store our own verifier BEFORE initiating OAuth flow
    const verifier = setupPKCEVerifier();
    console.log("Generated PKCE verifier:", verifier.substring(0, 5) + "...");
    
    // Create a unique session ID to track this sign-in attempt
    const sessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    localStorage.setItem('auth_session_id', sessionId);
    
    // Store the verifier in multiple extra places with the session ID
    localStorage.setItem(`pkce_verifier_${sessionId}`, verifier);
    sessionStorage.setItem(`pkce_verifier_${sessionId}`, verifier);
    
    // Double check that it's actually stored
    console.log("Verifier storage check before redirect:");
    console.log("- localStorage:", !!localStorage.getItem('supabase.auth.code_verifier'));
    console.log("- sessionStorage:", !!sessionStorage.getItem('supabase.auth.code_verifier'));
    console.log("- backup location:", !!localStorage.getItem(`pkce_verifier_${sessionId}`));

    // Let Supabase handle the OAuth flow
    console.log("Starting OAuth flow with Google...");
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?sid=${sessionId}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          // Pass our session ID to help with tracking
          state: sessionId
        }
      }
    });
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