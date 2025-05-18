import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Get environment variables
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://wqojeesjtgfcftpnzaet.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Using environment variable with fallback
console.log('Using Supabase URL:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing');
}

// Configure client with optimized settings
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: localStorage,
      storageKey: 'supabase.auth.token',
      flowType: 'pkce',
    },
    global: {
      headers: {
        'X-Client-Info': 'chat-app-client',
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
        // Enforcing a timeout on fetch requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        return fetch(url, {
          ...options,
          cache: 'no-store',
          signal: controller.signal
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      },
    }
  }
);

// Add global fetch interceptor to add API key header for all requests
const originalFetch = supabase.rest.fetchWithAuth;
supabase.rest.fetchWithAuth = async (url, options = {}) => {
  // Ensure headers object exists
  if (!options.headers) {
    options.headers = {};
  }

  // Add the required headers for all requests
  options.headers['apikey'] = supabase.supabaseKey;
  options.headers['Accept'] = 'application/json';
  options.headers['Content-Type'] = 'application/json';

  return originalFetch(url, options);
};

const statusChannel = supabase.channel('connection-status');

statusChannel
  .on('system', { event: 'disconnect' }, () => {
    console.log('Supabase realtime disconnected, attempting to reconnect...');
  })
  .on('system', { event: 'reconnect' }, () => {
    console.log('Supabase realtime reconnecting...');
  })
  .on('system', { event: 'connected' }, () => {
    console.log('Supabase realtime connected');
  })
  .subscribe();

// Handle page visibility changes to manage connection
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Force reconnect when tab becomes visible again
      supabase.realtime.connect();
    }
  });
}

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