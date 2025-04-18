
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
  
  if (verifier.length < 20) {
    console.error('[PKCE] Verifier is too short, must be at least 20 chars');
    return false;
  }
  
  try {
    console.log('[PKCE] Storing verifier:', verifier.substring(0, 8) + '...', 'length:', verifier.length);
    
    // Store in localStorage (primary storage used by Supabase)
    localStorage.setItem('supabase.auth.code_verifier', verifier);
    
    // Create backup storage locations with multiple naming patterns
    sessionStorage.setItem('supabase.auth.code_verifier', verifier);
    localStorage.setItem('pkce_verifier_backup', verifier);
    localStorage.setItem('sb-pkce-verifier', verifier);
    
    // Add timestamps to help with debugging
    const timestamp = Date.now();
    localStorage.setItem('pkce_timestamp', timestamp.toString());
    
    // Create a session ID for tracking this auth attempt
    const sessionId = Math.random().toString(36).substring(2);
    localStorage.setItem('auth_session_id', sessionId);
    localStorage.setItem(`pkce_verifier_${sessionId}`, verifier);
    
    // Set robust cookies as additional backup
    const secure = window.location.protocol === 'https:' ? 'Secure;' : '';
    document.cookie = `pkce_verifier=${verifier};max-age=600;path=/;SameSite=Lax;${secure}`;
    document.cookie = `supabase_code_verifier=${verifier};max-age=600;path=/;SameSite=Lax;${secure}`;
    document.cookie = `pkce_${sessionId}=${verifier.substring(0, 20)};max-age=600;path=/;SameSite=Lax;${secure}`;
    
    console.log('[PKCE] Verifier stored in multiple locations successfully');
    return true;
  } catch (error) {
    console.error('[PKCE] Error storing verifier:', error);
    return false;
  }
};

// Retrieve PKCE verifier from available storage
export const getPKCEVerifier = () => {
  console.log('[PKCE] Searching for PKCE verifier in all storage locations...');
  
  // First try the primary location used by Supabase
  const verifier = localStorage.getItem('supabase.auth.code_verifier');
  
  if (verifier) {
    console.log('[PKCE] Found verifier in localStorage:', verifier.substring(0, 8) + '...', 'length:', verifier.length);
    
    // Verify it's a valid verifier (must be reasonably long)
    if (verifier.length >= 20) {
      // Ensure it's also stored in all backup locations
      sessionStorage.setItem('supabase.auth.code_verifier', verifier);
      localStorage.setItem('pkce_verifier_backup', verifier);
      localStorage.setItem('sb-pkce-verifier', verifier);
      
      // Update cookies too
      const secure = window.location.protocol === 'https:' ? 'Secure;' : '';
      document.cookie = `pkce_verifier=${verifier};max-age=600;path=/;SameSite=Lax;${secure}`;
      document.cookie = `supabase_code_verifier=${verifier};max-age=600;path=/;SameSite=Lax;${secure}`;
      
      return verifier;
    } else {
      console.warn('[PKCE] Found verifier is too short:', verifier.length);
    }
  }
  
  // Try ALL possible backup locations
  const backups = {
    'sessionStorage': sessionStorage.getItem('supabase.auth.code_verifier'),
    'pkce_verifier_backup': localStorage.getItem('pkce_verifier_backup'),
    'sb-pkce-verifier': localStorage.getItem('sb-pkce-verifier'),
    'pkce_verifier_original': localStorage.getItem('pkce_verifier_original')
  };
  
  // Check session-specific backup
  const sessionId = localStorage.getItem('auth_session_id');
  if (sessionId) {
    backups[`pkce_verifier_${sessionId}`] = localStorage.getItem(`pkce_verifier_${sessionId}`);
  }
  
  // Get from cookies
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if ((name === 'pkce_verifier' || name === 'supabase_code_verifier') && value) {
      backups[name] = value;
    }
    // Check session-specific cookie
    if (sessionId && name === `pkce_${sessionId}`) {
      backups[name] = value;
    }
  }
  
  // Log all found backups
  console.log('[PKCE] Checking backups:', Object.keys(backups).filter(k => backups[k]).join(', '));
  
  // Find the first valid backup
  for (const [source, value] of Object.entries(backups)) {
    if (value && value.length >= 20) {
      console.log(`[PKCE] Recovered verifier from ${source}:`, value.substring(0, 8) + '...', 'length:', value.length);
      
      // Restore to primary location
      localStorage.setItem('supabase.auth.code_verifier', value);
      
      // Also restore to all other backup locations
      sessionStorage.setItem('supabase.auth.code_verifier', value);
      localStorage.setItem('pkce_verifier_backup', value);
      localStorage.setItem('sb-pkce-verifier', value);
      
      // Update cookies
      const secure = window.location.protocol === 'https:' ? 'Secure;' : '';
      document.cookie = `pkce_verifier=${value};max-age=600;path=/;SameSite=Lax;${secure}`;
      document.cookie = `supabase_code_verifier=${value};max-age=600;path=/;SameSite=Lax;${secure}`;
      
      return value;
    }
  }
  
  console.warn('[PKCE] No valid verifier found in any storage location');
  
  // Last resort - check localStorage for anything that looks like a verifier
  const allLocalStorage = { ...localStorage };
  for (const [key, value] of Object.entries(allLocalStorage)) {
    if (typeof value === 'string' && value.length >= 40 && 
        (key.includes('verifier') || key.includes('pkce') || key.includes('code'))) {
      console.log('[PKCE] Found potential verifier in:', key);
      localStorage.setItem('supabase.auth.code_verifier', value);
      return value;
    }
  }
  
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
