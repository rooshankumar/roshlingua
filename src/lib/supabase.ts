
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing');
}

// Create a single supabase client for the entire app
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Use PKCE flow for more reliable token exchange
    storageKey: 'sb-auth-token',
    storage: {
      getItem: (key) => {
        try {
          // Try localStorage first, then sessionStorage as fallback
          let value = localStorage.getItem(key);
          if (!value && key.includes('code_verifier')) {
            // For PKCE verifiers, also check sessionStorage
            value = sessionStorage.getItem(key);
          }
          return value;
        } catch (error) {
          console.error('Error getting auth storage item:', error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          // For login with different Google accounts, we need to clear all previous auth data
          if (key === 'sb-auth-token' || key.includes('supabase.auth.token')) {
            // Clear all known auth token storage locations
            localStorage.removeItem('sb-auth-token');
            localStorage.removeItem('supabase.auth.token');
            sessionStorage.removeItem('supabase.auth.token');
            localStorage.removeItem('supabase.auth.expires_at');
            sessionStorage.removeItem('supabase.auth.expires_at');
            
            // Also clear any PKCE verifiers to ensure clean authentication
            localStorage.removeItem('supabase.auth.code_verifier');
            sessionStorage.removeItem('supabase.auth.code_verifier');
            localStorage.removeItem('supabase.auth.code');
            sessionStorage.removeItem('supabase.auth.code');
          }
          
          // Store PKCE verifiers in both localStorage and sessionStorage for redundancy
          if (key.includes('code_verifier')) {
            localStorage.setItem(key, value);
            sessionStorage.setItem(key, value);
          } else {
            localStorage.setItem(key, value);
          }
          return;
        } catch (error) {
          console.error('Error setting auth storage item:', error);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
          
          // If clearing main token, clear all related auth data
          if (key === 'sb-auth-token' || key === 'supabase.auth.token') {
            // Clear all known auth token locations
            localStorage.removeItem('sb-auth-token');
            localStorage.removeItem('supabase.auth.token');
            sessionStorage.removeItem('supabase.auth.token');
            localStorage.removeItem('supabase.auth.expires_at');
            sessionStorage.removeItem('supabase.auth.expires_at');
            localStorage.removeItem('supabase.auth.code_verifier');
            sessionStorage.removeItem('supabase.auth.code_verifier');
            localStorage.removeItem('supabase.auth.code');
            sessionStorage.removeItem('supabase.auth.code');
          }
          return;
        } catch (error) {
          console.error('Error removing auth storage item:', error);
        }
      }
    }
  },
  global: {
    headers: {
      // Add multiple Accept headers to fix 406 errors
      'Accept': 'application/json, text/*, */*',
      // Add content type for profile requests
      'Content-Type': 'application/json'
    },
    // Add retry behavior for failed requests
    fetch: (url, options) => {
      const maxRetries = 3;
      
      const fetchWithRetry = async (retriesLeft) => {
        try {
          const response = await fetch(url, options);
          
          // If we get a 406 error, try again with adjusted headers
          if (response.status === 406 && retriesLeft > 0) {
            console.log(`Got 406 error, retrying with adjusted headers (${retriesLeft} attempts left)`);
            
            // Add more specific headers for the retry
            const newOptions = {
              ...options,
              headers: {
                ...options?.headers,
                'Accept': '*/*',
                'Content-Type': 'application/json'
              }
            };
            
            // Wait a moment before retrying
            await new Promise(r => setTimeout(r, 300));
            return fetchWithRetry(retriesLeft - 1);
          }
          
          return response;
        } catch (error) {
          if (retriesLeft > 0) {
            console.log(`Fetch error, retrying (${retriesLeft} attempts left)`, error);
            
            // Wait longer for network errors
            await new Promise(r => setTimeout(r, 500));
            return fetchWithRetry(retriesLeft - 1);
          }
          
          throw error;
        }
      };
      
      return fetchWithRetry(maxRetries);
    }
  }
});

// Simple auth helpers
export const signOut = async () => {
  try {
    await supabase.auth.signOut();
    return true;
  } catch (error) {
    console.error("Error signing out:", error);
    return false;
  }
};

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
};

export const getCurrentSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
};

export const signInWithGoogle = async () => {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    }
  });
};
