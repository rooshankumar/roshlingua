import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single Supabase client instance with optimized real-time settings
export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'roshlingua-auth',
    storage: window?.localStorage
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    },
    heartbeatIntervalMs: 30000,
    reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 10000),
    timeout: 20000
  },
  global: {
    headers: {
      'x-application-name': 'roshlingua-chat'
    }
  }
});

// Enhanced retry utility with exponential backoff
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
};

// Connection health check
export const checkConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await withRetry(async () => {
      return await supabase.from('profiles').select('id').limit(1);
    }, 2, 500);

    return !error;
  } catch (error) {
    console.error('Connection check failed:', error);
    return false;
  }
};

// Export the enhanced supabase client as default
export default supabase;