import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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
      flowType: 'pkce', // Explicitly enable PKCE flow
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
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
    },
    realtime: {
      timeout: 10000, // Faster timeout for realtime connections
      params: {
        eventsPerSecond: 5 // Limit realtime events rate
      }
    }
  }
);

// Add connection recovery event listeners
  // Use channel-based approach for realtime events

// Add global fetch interceptor to add API key header for all requests
const originalFetch = supabase.rest.fetchWithAuth;
supabase.rest.fetchWithAuth = async (url, options) => {
  if (!options.headers) {
    options.headers = {};
  }

  // Add the apikey header to all requests
  options.headers['apikey'] = supabase.supabaseKey;
  options.headers['Accept'] = 'application/json';

  return originalFetch(url, options);
};

// Add connection recovery event listeners
// Use channel-based approach for realtime events
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