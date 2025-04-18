
import { supabase } from '@/lib/supabase';

// Generate a proper length verifier for PKCE
export const generateVerifier = () => {
  // Create a secure random 32-byte array
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  // Convert to base64url encoding (safe for URL parameters)
  return btoa(String.fromCharCode.apply(null, [...array]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Store PKCE verifier in multiple storage locations for redundancy
export const storePKCEVerifier = (verifier: string) => {
  if (!verifier) {
    console.error('[PKCE] Attempted to store empty verifier');
    return false;
  }
  
  try {
    console.log('[PKCE] Storing verifier:', verifier.substring(0, 8) + '...', 'length:', verifier.length);
    
    // Store in localStorage (primary storage used by Supabase)
    localStorage.setItem('supabase.auth.code_verifier', verifier);
    
    // Create backup storage locations
    sessionStorage.setItem('supabase.auth.code_verifier', verifier);
    localStorage.setItem('pkce_verifier_backup', verifier);
    
    // Set a cookie as additional backup
    const secure = window.location.protocol === 'https:' ? 'Secure;' : '';
    document.cookie = `pkce_verifier=${verifier};max-age=600;path=/;SameSite=Lax;${secure}`;
    
    return true;
  } catch (error) {
    console.error('[PKCE] Error storing verifier:', error);
    return false;
  }
};

// Retrieve PKCE verifier from available storage
export const getPKCEVerifier = () => {
  // First try the primary location used by Supabase
  const verifier = localStorage.getItem('supabase.auth.code_verifier');
  
  if (verifier) {
    console.log('[PKCE] Found verifier in localStorage:', verifier.substring(0, 8) + '...', 'length:', verifier.length);
    return verifier;
  }
  
  // Try backup locations
  const sessionVerifier = sessionStorage.getItem('supabase.auth.code_verifier');
  const backupVerifier = localStorage.getItem('pkce_verifier_backup');
  
  // Get from cookie if needed
  const cookies = document.cookie.split(';');
  let cookieVerifier = null;
  
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'pkce_verifier' && value) {
      cookieVerifier = value;
      break;
    }
  }
  
  // Use first available backup and restore to primary location
  const recoveredVerifier = sessionVerifier || backupVerifier || cookieVerifier;
  
  if (recoveredVerifier) {
    console.log('[PKCE] Recovered verifier from backup:', recoveredVerifier.substring(0, 8) + '...', 'length:', recoveredVerifier.length);
    localStorage.setItem('supabase.auth.code_verifier', recoveredVerifier);
    return recoveredVerifier;
  }
  
  console.warn('[PKCE] No verifier found in any storage location');
  return null;
};

// Clear PKCE verifier from all storage locations
export const clearPKCEVerifier = () => {
  localStorage.removeItem('supabase.auth.code_verifier');
  sessionStorage.removeItem('supabase.auth.code_verifier');
  localStorage.removeItem('pkce_verifier_backup');
  document.cookie = 'pkce_verifier=; max-age=0; path=/';
  
  console.log('[PKCE] All verifiers cleared');
};

// Exchange auth code for session (used in callback route)
export const exchangeAuthCode = async (code: string) => {
  console.log('[PKCE] Exchanging auth code for session');

  if (!code) {
    console.error('[PKCE] Missing auth code');
    return { data: { session: null }, error: new Error('Missing auth code') };
  }

  // Get verifier before exchange
  const verifier = getPKCEVerifier();
  
  if (!verifier) {
    console.error('[PKCE] Critical: Missing code verifier for auth exchange');
    return { data: { session: null }, error: new Error('Missing code verifier') };
  }

  console.log('[PKCE] Using verifier with length:', verifier.length);
  console.log('[PKCE] Using auth code with length:', code.length);

  try {
    // Perform the code exchange
    return await supabase.auth.exchangeCodeForSession(code);
  } catch (error) {
    console.error('[PKCE] Code exchange error:', error);
    return { data: { session: null }, error };
  } finally {
    // Clear verifier after exchange attempt (successful or not)
    clearPKCEVerifier();
  }
};

// Debug function to check PKCE state
export const debugPKCEState = () => {
  const verifier = localStorage.getItem('supabase.auth.code_verifier');
  const sessionVerifier = sessionStorage.getItem('supabase.auth.code_verifier');
  const backupVerifier = localStorage.getItem('pkce_verifier_backup');
  
  // Check for cookie
  const cookies = document.cookie.split(';');
  let cookieVerifier = null;
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'pkce_verifier') {
      cookieVerifier = value;
      break;
    }
  }
  
  console.group('PKCE Debug Info');
  console.log('Verifier in localStorage:', verifier ? 
    `${verifier.substring(0, 8)}... (${verifier.length} chars)` : 'NOT FOUND');
  console.log('Verifier in sessionStorage:', sessionVerifier ? 
    `${sessionVerifier.substring(0, 8)}... (${sessionVerifier.length} chars)` : 'NOT FOUND');
  console.log('Backup verifier:', backupVerifier ? 
    `${backupVerifier.substring(0, 8)}... (${backupVerifier.length} chars)` : 'NOT FOUND');
  console.log('Cookie verifier:', cookieVerifier ? 
    `${cookieVerifier.substring(0, 8)}... (${cookieVerifier.length} chars)` : 'NOT FOUND');
  
  // Check URL for code param
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  console.log('URL code param:', code ? 
    `${code.substring(0, 8)}... (${code.length} chars)` : 'NOT FOUND');
  console.groupEnd();

  return { 
    hasVerifier: !!verifier, 
    hasBackupVerifier: !!backupVerifier,
    hasCookieVerifier: !!cookieVerifier,
    hasSessionVerifier: !!sessionVerifier,
    hasCodeParam: !!code
  };
};
