
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
    detectSessionInUrl: false, // Disable automatic detection - we'll handle it manually
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
          // Store PKCE verifiers in both localStorage and sessionStorage for redundancy
          if (key.includes('code_verifier')) {
            localStorage.setItem(key, value);
            sessionStorage.setItem(key, value);
            
            // Store PKCE state keys in both storages too
            if (key === 'supabase.auth.code_verifier') {
              const randomState = Math.random().toString(36).substring(2, 15);
              localStorage.setItem('supabase.auth.state', randomState);
              sessionStorage.setItem('supabase.auth.state', randomState);
            }
          } else {
            // Store normal items in localStorage
            localStorage.setItem(key, value);
            
            // For tokens, ensure we clear old values first
            if (key === 'sb-auth-token' || key.includes('supabase.auth.token')) {
              localStorage.removeItem('sb-previous-auth-token');
              localStorage.setItem('sb-previous-auth-token', value);
            }
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
          
          // If clearing main token, don't clear PKCE data yet
          if (key === 'sb-auth-token' || key === 'supabase.auth.token') {
            localStorage.removeItem('sb-auth-token');
            localStorage.removeItem('supabase.auth.token');
            sessionStorage.removeItem('supabase.auth.token');
            localStorage.removeItem('supabase.auth.expires_at');
            sessionStorage.removeItem('supabase.auth.expires_at');
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

// Function to clear all auth-related data - helps fix OAuth state issues
export const clearAllAuthData = () => {
  // List of all auth-related keys to clear
  const authKeys = [
    'sb-auth-token',
    'supabase.auth.token',
    'supabase.auth.expires_at',
    'supabase.auth.code_verifier',
    'supabase.auth.code',
    'supabase.auth.state',
    'sb-refresh-token',
    'supabase.auth.refresh_token',
    'supabase.auth.access_token'
  ];
  
  // Remove from both storage types
  authKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn(`Failed to clear ${key}:`, e);
    }
  });
  
  // Clear any cookies with auth data
  document.cookie.split(';').forEach(cookie => {
    const name = cookie.trim().split('=')[0];
    if (name.includes('supabase') || name.includes('auth') || name.includes('sb-')) {
      document.cookie = `${name}=; max-age=0; path=/;`;
    }
  });
  
  console.log('All auth data cleared');
};

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
