import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(`
    Missing Supabase environment variables.
    Found:
    VITE_SUPABASE_URL: ${supabaseUrl ? 'exists' : 'missing'}
    VITE_SUPABASE_ANON_KEY: ${supabaseKey ? 'exists' : 'missing'}
  `);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// Test connection function
export const testConnection = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Connection test failed:', {
      message: error.message,
      details: error.details,
      code: error.code
    });
    throw error;
  }
  return data;
};