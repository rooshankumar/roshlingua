
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log('Using Supabase URL:', supabaseUrl);

// Enhanced Supabase client with retry logic and timeout handling
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-client-info': 'roshlingua-chat-app'
    }
  }
});

// Enhanced error handler with retry logic
const withRetry = async <T>(
  operation: () => Promise<T>, 
  maxRetries = 3, 
  delay = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const result = await operation();
      clearTimeout(timeoutId);
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on auth errors or client errors
      if (error?.code && (error.code.startsWith('4') || error.code === 'PGRST')) {
        throw error;
      }
      
      // Don't retry on abort errors unless it's a timeout
      if (error?.name === 'AbortError' && !error?.message?.includes('timeout')) {
        console.warn(`Operation aborted on attempt ${attempt}:`, error);
        if (attempt === maxRetries) throw error;
      }
      
      console.warn(`Attempt ${attempt} failed:`, error?.message || error);
      
      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
};

// Enhanced query wrapper
export const executeQuery = async <T>(queryFn: () => Promise<T>): Promise<T> => {
  return withRetry(queryFn, 3, 1000);
};

// Google OAuth sign-in with enhanced error handling
export const signInWithGoogle = async () => {
  try {
    console.log('🔐 Initiating Google sign-in...');
    
    const result = await withRetry(async () => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      });
      
      if (error) throw error;
      return { data, error };
    });
    
    console.log('✅ Google sign-in initiated successfully');
    return result;
  } catch (error) {
    console.error('❌ Google sign-in failed:', error);
    throw error;
  }
};

// Enhanced sign out
export const signOut = async () => {
  try {
    console.log('🔓 Signing out...');
    
    await withRetry(async () => {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
    });
    
    // Clear any cached data
    localStorage.removeItem('supabase.auth.token');
    sessionStorage.clear();
    
    console.log('✅ Signed out successfully');
  } catch (error) {
    console.error('❌ Sign out failed:', error);
    throw error;
  }
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
