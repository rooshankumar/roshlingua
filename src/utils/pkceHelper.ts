
import { supabase } from '@/lib/supabase';

// Generate a random string for PKCE verifier
export const generateVerifier = () => {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Store PKCE verifier in multiple storage locations for redundancy
export const storePKCEVerifier = (verifier: string) => {
  if (!verifier) {
    console.error('[PKCE] Attempted to store empty verifier');
    return false;
  }
  
  try {
    // Store in localStorage (primary)
    localStorage.setItem('supabase.auth.code_verifier', verifier);
    
    // Backup storage in sessionStorage and cookies
    sessionStorage.setItem('supabase.auth.code_verifier', verifier);
    document.cookie = `pkce_verifier=${verifier};max-age=600;path=/;SameSite=Lax`;
    
    // Additional backup with session ID
    const sessionId = Date.now().toString(36);
    localStorage.setItem('auth_session_id', sessionId);
    localStorage.setItem(`pkce_verifier_${sessionId}`, verifier);
    
    console.log('[PKCE] Verifier stored successfully in multiple locations');
    return true;
  } catch (error) {
    console.error('[PKCE] Error storing verifier:', error);
    return false;
  }
};

// Retrieve PKCE verifier from available storage
export const getPKCEVerifier = () => {
  // Try localStorage first (primary location)
  const localVerifier = localStorage.getItem('supabase.auth.code_verifier');
  if (localVerifier) return localVerifier;
  
  // Try sessionStorage as fallback
  const sessionVerifier = sessionStorage.getItem('supabase.auth.code_verifier');
  if (sessionVerifier) {
    // Restore to localStorage
    localStorage.setItem('supabase.auth.code_verifier', sessionVerifier);
    return sessionVerifier;
  }
  
  // Try cookie as last resort
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'pkce_verifier' && value) {
      // Restore to standard locations
      localStorage.setItem('supabase.auth.code_verifier', value);
      sessionStorage.setItem('supabase.auth.code_verifier', value);
      return value;
    }
  }
  
  // Check backup with session ID
  const sessionId = localStorage.getItem('auth_session_id');
  if (sessionId) {
    const backupVerifier = localStorage.getItem(`pkce_verifier_${sessionId}`);
    if (backupVerifier) {
      // Restore to standard locations
      localStorage.setItem('supabase.auth.code_verifier', backupVerifier);
      sessionStorage.setItem('supabase.auth.code_verifier', backupVerifier);
      return backupVerifier;
    }
  }
  
  console.warn('[PKCE] No verifier found in any storage location');
  return null;
};

// Clear PKCE verifier from all storage locations
export const clearPKCEVerifier = () => {
  localStorage.removeItem('supabase.auth.code_verifier');
  sessionStorage.removeItem('supabase.auth.code_verifier');
  document.cookie = 'pkce_verifier=; max-age=0; path=/';
  
  // Clean up backup
  const sessionId = localStorage.getItem('auth_session_id');
  if (sessionId) {
    localStorage.removeItem(`pkce_verifier_${sessionId}`);
    localStorage.removeItem('auth_session_id');
  }
  
  console.log('[PKCE] All verifiers cleared');
};

// Exchange auth code for session (used in callback route)
export const exchangeAuthCode = async (code: string) => {
  console.log('[PKCE] Exchanging auth code for session');

  if (!code) {
    console.error('[PKCE] Missing auth code');
    return { data: { session: null }, error: new Error('Missing auth code') };
  }

  // Make sure verifier exists before exchange
  const verifier = getPKCEVerifier();
  if (!verifier) {
    console.error('[PKCE] Missing code verifier, attempting to proceed anyway');
  } else {
    console.log('[PKCE] Code verifier found, length:', verifier.length);
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
  const sessionVerifier = sessionStorage.getItem('supabase.auth.code_verifier');
  
  console.group('PKCE Debug Info');
  console.log('Verifier in localStorage:', verifier ? 
    `${verifier.substring(0, 8)}... (${verifier.length} chars)` : 'NOT FOUND');
  console.log('Verifier in sessionStorage:', sessionVerifier ? 
    `${sessionVerifier.substring(0, 8)}... (${sessionVerifier.length} chars)` : 'NOT FOUND');
  
  // Check URL for code param
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  console.log('URL code param:', code ? 
    `${code.substring(0, 8)}... (${code.length} chars)` : 'NOT FOUND');
  console.groupEnd();

  return { 
    hasVerifier: !!verifier, 
    hasSessionVerifier: !!sessionVerifier,
    hasCodeParam: !!code
  };
};
