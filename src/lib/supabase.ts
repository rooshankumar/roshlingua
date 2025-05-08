import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing');
}

// Create client with auto-reconnect capabilities
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
        return fetch(url, {
          ...options,
          cache: 'no-store',
        });
      },
    }
  }
);

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