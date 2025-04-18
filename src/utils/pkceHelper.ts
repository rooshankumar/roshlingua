import { supabase } from '@/lib/supabase';

// Exchange auth code for session (used in callback route)
export const exchangeAuthCode = async (code: string) => {
  console.log('[PKCE] Exchanging auth code for session');

  if (!code) {
    console.error('[PKCE] Missing auth code');
    return { data: { session: null }, error: new Error('Missing auth code') };
  }

  try {
    // Let Supabase handle the exchange
    console.log('[PKCE] Sending code to Supabase, length:', code.length);
    return await supabase.auth.exchangeCodeForSession(code);
  } catch (error) {
    console.error('[PKCE] Code exchange error:', error);
    return { data: { session: null }, error };
  }
};

// Debug function to check PKCE state
export const debugPKCEState = () => {
  const verifier = localStorage.getItem('supabase.auth.code_verifier');

  console.group('PKCE Debug Info');
  console.log('Verifier in localStorage:', verifier ? 
    `${verifier.substring(0, 8)}... (${verifier.length} chars)` : 'NOT FOUND');
  console.groupEnd();

  return { hasVerifier: !!verifier };
};