import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing');
}

// Create a single supabase client for the entire app
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: false, // Disable debug logs
    storage: window?.localStorage, // Use PKCE flow for more reliable token exchange
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
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    fetch: (url, options) => {
      // Add cache busting for storage URLs
      if (url.toString().includes('/storage/v1/object/public/')) {
        const separator = url.toString().includes('?') ? '&' : '?';
        url = new URL(`${url.toString()}${separator}t=${Date.now()}`);
      }
      return fetch(url, {
        ...options,
        cache: 'no-store',
      });
    },
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