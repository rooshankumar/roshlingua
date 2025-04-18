import { supabase } from '@/lib/supabase';

// Generate a secure random string for PKCE
export const generateVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

// Get the PKCE verifier directly from localStorage
export const getPKCEVerifier = (): string | null => {
  return localStorage.getItem('supabase.auth.code_verifier');
};

// Store the PKCE verifier directly in localStorage
export const storePKCEVerifier = (verifier: string): void => {
  if (!verifier) {
    console.error('[PKCE] Attempted to store empty verifier');
    return;
  }

  console.log('[PKCE] Storing verifier:', verifier.substring(0, 5) + '...');
  localStorage.setItem('supabase.auth.code_verifier', verifier);
};

// Clear the PKCE verifier
export const clearPKCEVerifier = (): void => {
  console.log('[PKCE] Clearing verifier');
  localStorage.removeItem('supabase.auth.code_verifier');
};

// Generate and sync our own verifier before OAuth flow starts
export const setupPKCEVerifier = (): string => {
  clearPKCEVerifier();
  const verifier = generateVerifier();
  storePKCEVerifier(verifier);
  return verifier;
};

// Handle auth code exchange
export const exchangeAuthCode = async (code: string) => {
  console.log('[PKCE] Exchanging auth code for session');

  if (!code) {
    console.error('[PKCE] Missing auth code');
    return { data: { session: null }, error: new Error('Missing auth code') };
  }

  const verifier = getPKCEVerifier();
  if (!verifier) {
    console.error('[PKCE] No code verifier found');
    return { 
      data: { session: null }, 
      error: new Error('PKCE verifier not found') 
    };
  }

  try {
    console.log('[PKCE] Code exchange with verifier:', verifier.substring(0, 5) + '...');
    return await supabase.auth.exchangeCodeForSession(code);
  } catch (error) {
    console.error('[PKCE] Code exchange error:', error);
    return { data: { session: null }, error };
  }
};