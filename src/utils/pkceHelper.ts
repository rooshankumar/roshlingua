import { supabase } from '@/lib/supabase';

// Generate a secure random string for PKCE
export const generateVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

// Get the PKCE verifier from multiple possible storage locations
export const getPKCEVerifier = (): string | null => {
  // Try primary storage location
  const verifier = localStorage.getItem('supabase.auth.code_verifier');
  if (verifier) {
    console.log('[PKCE] Found verifier in localStorage:', verifier.substring(0, 5) + '...');
    return verifier;
  }

  // Backup locations
  const sessionVerifier = sessionStorage.getItem('supabase.auth.code_verifier');
  if (sessionVerifier) {
    console.log('[PKCE] Found verifier in sessionStorage:', sessionVerifier.substring(0, 5) + '...');
    // Restore to primary location
    localStorage.setItem('supabase.auth.code_verifier', sessionVerifier);
    return sessionVerifier;
  }

  // Check cookie as last resort
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'pkce_verifier' && value) {
      console.log('[PKCE] Found verifier in cookie:', value.substring(0, 5) + '...');
      // Restore to primary location
      localStorage.setItem('supabase.auth.code_verifier', value);
      return value;
    }
  }

  console.error('[PKCE] No verifier found in any storage location');
  return null;
};

// Store the PKCE verifier in all available storage mechanisms
export const storePKCEVerifier = (verifier: string): void => {
  if (!verifier) {
    console.error('[PKCE] Attempted to store empty verifier');
    return;
  }

  console.log('[PKCE] Storing verifier in all locations:', verifier.substring(0, 5) + '...');

  // Primary storage
  localStorage.setItem('supabase.auth.code_verifier', verifier);

  // Backup storage
  sessionStorage.setItem('supabase.auth.code_verifier', verifier);

  // Cookie storage (10 min expiry)
  document.cookie = `pkce_verifier=${verifier};max-age=600;path=/;SameSite=Lax`;

  // Also store in alternate locations that Supabase might check
  localStorage.setItem('sb-pkce-verifier', verifier);
};

// Clear the PKCE verifier from all storage locations
export const clearPKCEVerifier = (): void => {
  console.log('[PKCE] Clearing all verifier storage locations');
  localStorage.removeItem('supabase.auth.code_verifier');
  sessionStorage.removeItem('supabase.auth.code_verifier');
  localStorage.removeItem('sb-pkce-verifier');
  document.cookie = 'pkce_verifier=; max-age=0; path=/;';
};

// Generate and sync verifier before OAuth flow starts
export const setupPKCEVerifier = (): string => {
  // Clear any existing verifiers first
  clearPKCEVerifier();

  // Generate a new verifier
  const verifier = generateVerifier();
  console.log('[PKCE] Generated new verifier:', verifier.substring(0, 5) + '...');

  // Store in all locations
  storePKCEVerifier(verifier);

  // Return for immediate use
  return verifier;
};

// Exchange auth code for session (used in callback route)
export const exchangeAuthCode = async (code: string) => {
  console.log('[PKCE] Exchanging auth code for session');

  if (!code) {
    console.error('[PKCE] Missing auth code');
    return { data: { session: null }, error: new Error('Missing auth code') };
  }

  try {
    // Let Supabase handle the exchange - it should have stored the verifier internally
    console.log('[PKCE] Code length:', code.length);

    // Attempt the exchange
    return await supabase.auth.exchangeCodeForSession(code);
  } catch (error) {
    console.error('[PKCE] Code exchange error:', error);
    return { data: { session: null }, error };
  }
};