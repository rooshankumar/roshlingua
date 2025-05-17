import { supabase } from '@/lib/supabase';

// Generate a proper length verifier for PKCE
export const generateVerifier = () => {
  // Create a secure random 32-byte array
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  // Convert to base64url encoding (safe for URL parameters)
  const verifier = btoa(String.fromCharCode.apply(null, [...array]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  console.log('[PKCE] Generated Verifier:', verifier.substring(0, 8) + '...', 'length:', verifier.length); // Added log

  // Immediately store the verifier in all locations
  storePKCEVerifier(verifier);

  return verifier;
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
    localStorage.setItem('code_verifier', verifier);
    sessionStorage.setItem('code_verifier', verifier);

    // Add timestamps to help with debugging
    const timestamp = Date.now();
    localStorage.setItem('pkce_timestamp', timestamp.toString());

    // Create a session ID for tracking this auth attempt
    const sessionId = Math.random().toString(36).substring(2);
    localStorage.setItem('auth_session_id', sessionId);
    localStorage.setItem(`pkce_verifier_${sessionId}`, verifier);

    // Set robust cookies with various naming patterns for maximum compatibility
    const secure = window.location.protocol === 'https:' ? 'Secure;' : '';
    const domain = window.location.hostname.includes('localhost') ? '' : `domain=${window.location.hostname};`;

    // Set cookies with longer expiry and multiple options
    document.cookie = `pkce_verifier=${verifier};max-age=3600;path=/;SameSite=Lax;${domain}${secure}`;
    document.cookie = `supabase_code_verifier=${verifier};max-age=3600;path=/;SameSite=Lax;${domain}${secure}`;
    document.cookie = `sb_pkce_verifier=${verifier};max-age=3600;path=/;SameSite=Lax;${domain}${secure}`;
    document.cookie = `code_verifier=${verifier};max-age=3600;path=/;SameSite=Lax;${domain}${secure}`;
    document.cookie = `pkce_${sessionId}=${verifier};max-age=3600;path=/;SameSite=Lax;${domain}${secure}`;

    // Special handling for subdomains and top domains
    if (window.location.hostname.includes('.')) {
      const topDomain = window.location.hostname.split('.').slice(-2).join('.');
      document.cookie = `pkce_verifier=${verifier};max-age=3600;path=/;domain=.${topDomain};SameSite=Lax;${secure}`;
    }

    // Store in localStorage with multiple keys (shotgun approach)
    const verifierKeys = [
      'supabase.auth.code_verifier',
      'sb-code-verifier',
      'pkce_verifier',
      'code_verifier',
      'auth.code_verifier',
      'oauth_verifier'
    ];

    verifierKeys.forEach(key => {
      try {
        localStorage.setItem(key, verifier);
        sessionStorage.setItem(key, verifier);
      } catch (e) {
        // Ignore storage errors
      }
    });

    // Store in window object as last resort (will be lost on refresh but helps during redirects)
    try {
      (window as any).__PKCE_VERIFIER__ = verifier;
      (window as any).pkce_verifier = verifier;
      (window as any).code_verifier = verifier;
    } catch (e) {
      console.warn('[PKCE] Could not store in window object:', e);
    }

    // Create a hidden input field to persist the verifier (extreme fallback)
    try {
      let verifierInput = document.getElementById('pkce-verifier-store');
      if (!verifierInput) {
        verifierInput = document.createElement('input');
        verifierInput.type = 'hidden';
        verifierInput.id = 'pkce-verifier-store';
        document.body.appendChild(verifierInput);
      }
      (verifierInput as HTMLInputElement).value = verifier;
    } catch (e) {
      console.warn('[PKCE] Could not create hidden input:', e);
    }

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
      storePKCEVerifier(verifier);
      return verifier;
    } else {
      console.warn('[PKCE] Found verifier is too short:', verifier.length);
    }
  }

  // Try ALL possible backup locations
  const backups: Record<string, string | null> = {};

  // Check sessionStorage
  backups['sessionStorage'] = sessionStorage.getItem('supabase.auth.code_verifier');

  // Check all known localStorage keys
  const storageKeys = [
    'pkce_verifier_backup',
    'sb-pkce-verifier',
    'pkce_verifier_original',
    'code_verifier',
    'sb-code-verifier',
    'pkce_verifier',
    'auth.code_verifier',
    'oauth_verifier'
  ];

  storageKeys.forEach(key => {
    const localValue = localStorage.getItem(key);
    if (localValue) backups[`localStorage:${key}`] = localValue;

    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue) backups[`sessionStorage:${key}`] = sessionValue;
  });

  // Check session-specific backup
  const sessionId = localStorage.getItem('auth_session_id');
  if (sessionId) {
    backups[`pkce_verifier_${sessionId}`] = localStorage.getItem(`pkce_verifier_${sessionId}`);
  }

  // Get from cookies
  const cookieKeys = [
    'pkce_verifier',
    'supabase_code_verifier',
    'sb_pkce_verifier',
    'code_verifier'
  ];

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (value && value.length >= 20) {
      if (cookieKeys.includes(name)) {
        backups[`cookie:${name}`] = value;
      } else if (name.includes('verifier') || name.includes('pkce') || name.includes('code')) {
        backups[`cookie:${name}`] = value;
      }
    }

    // Check session-specific cookie
    if (sessionId && name === `pkce_${sessionId}`) {
      backups[`cookie:${name}`] = value;
    }
  }

  // Check window globals
  try {
    if ((window as any).__PKCE_VERIFIER__) {
      backups['window.__PKCE_VERIFIER__'] = (window as any).__PKCE_VERIFIER__;
    }
    if ((window as any).pkce_verifier) {
      backups['window.pkce_verifier'] = (window as any).pkce_verifier;
    }
    if ((window as any).code_verifier) {
      backups['window.code_verifier'] = (window as any).code_verifier;
    }
  } catch (e) {
    console.warn('[PKCE] Error checking window globals:', e);
  }

  // Check hidden input
  try {
    const verifierInput = document.getElementById('pkce-verifier-store') as HTMLInputElement;
    if (verifierInput && verifierInput.value && verifierInput.value.length >= 20) {
      backups['hidden_input'] = verifierInput.value;
    }
  } catch (e) {
    console.warn('[PKCE] Error checking hidden input:', e);
  }

  // Log all found backups
  const foundBackups = Object.keys(backups).filter(k => backups[k]);
  console.log('[PKCE] Found backup candidates:', foundBackups.length);
  if (foundBackups.length > 0) {
    console.log('[PKCE] Backup sources:', foundBackups.join(', '));
  }

  // Find the first valid backup
  for (const [source, value] of Object.entries(backups)) {
    if (value && value.length >= 20) {
      console.log(`[PKCE] Recovered verifier from ${source}:`, value.substring(0, 8) + '...', 'length:', value.length);

      // Store in all locations
      storePKCEVerifier(value);
      return value;
    }
  }

  console.warn('[PKCE] No valid verifier found in any storage location');

  // Super aggressive last resort - check ALL storage for ANY string that looks like a verifier
  try {
    // Combine all localStorage and sessionStorage
    const allStorage: Record<string, string> = {};

    // Check ALL localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) allStorage[`localStorage:${key}`] = value;
      }
    }

    // Check ALL sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key);
        if (value) allStorage[`sessionStorage:${key}`] = value;
      }
    }

    // Look for any string that could be a verifier (length 40+ characters)
    for (const [key, value] of Object.entries(allStorage)) {
      if (typeof value === 'string' && value.length >= 40) {
        console.log('[PKCE] Found potential verifier by length check in:', key);
        localStorage.setItem('supabase.auth.code_verifier', value);
        storePKCEVerifier(value);
        return value;
      }
    }
  } catch (e) {
    console.error('[PKCE] Error in last resort check:', e);
  }

  // URL fragment check - sometimes verifiers are in URL fragments
  try {
    const fragment = window.location.hash.substring(1);
    const fragmentParams = new URLSearchParams(fragment);
    const fragmentVerifier = fragmentParams.get('code_verifier') ||
                                       fragmentParams.get('verifier') ||
                                       fragmentParams.get('pkce');

    if (fragmentVerifier && fragmentVerifier.length >= 20) {
      console.log('[PKCE] Found verifier in URL fragment');
      localStorage.setItem('supabase.auth.code_verifier', fragmentVerifier);
      storePKCEVerifier(fragmentVerifier);
      return fragmentVerifier;
    }
  } catch (e) {
    console.error('[PKCE] Error checking URL fragment:', e);
  }

  return null;
};

// Clear PKCE verifier from all storage locations
export const clearPKCEVerifier = () => {
  console.log('[PKCE] Clearing all verifiers');

  // Clear from localStorage with all possible keys
  const storageKeys = [
    'supabase.auth.code_verifier',
    'pkce_verifier_backup',
    'sb-pkce-verifier',
    'pkce_verifier',
    'code_verifier',
    'sb-code-verifier',
    'auth.code_verifier',
    'oauth_verifier'
  ];

  storageKeys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  // Clear from cookies with multiple patterns
  const domain = window.location.hostname;
  const cookieKeys = [
    'pkce_verifier',
    'supabase_code_verifier',
    'sb_pkce_verifier',
    'code_verifier'
  ];

  cookieKeys.forEach(key => {
    document.cookie = `${key}=; max-age=0; path=/;`;
    document.cookie = `${key}=; max-age=0; path=/; domain=${domain};`;

    // For top-level domain too
    if (domain.includes('.')) {
      const topDomain = domain.split('.').slice(-2).join('.');
      document.cookie = `${key}=; max-age=0; path=/; domain=.${topDomain};`;
    }
  });

  // Try to clear backup input if it exists
  try {
    const backupInput = document.getElementById('pkce-verifier-store');
    if (backupInput) (backupInput as HTMLInputElement).value = '';

    const backupInput2 = document.getElementById('pkce-backup');
    if (backupInput2) (backupInput2 as HTMLInputElement).value = '';
  } catch (e) {
    console.warn('[PKCE] Error clearing backup input:', e);
  }

  console.log('[PKCE] All verifiers cleared');
};

// Exchange auth code for session (used in callback route)
export const exchangeAuthCode = async (code: string) => {
  console.log('[PKCE] Exchanging auth code for session, code:', code); // Added log

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

  console.log('[PKCE] Using verifier with length:', verifier.length, 'Verifier:', verifier.substring(0, 10) + '...'); // Added log

  try {
    // Explicitly set the verifier in localStorage again to ensure it's available
    localStorage.setItem('supabase.auth.code_verifier', verifier);

    // Perform the code exchange with the code and verifier
    const result = await supabase.auth.exchangeCodeForSession(code);

    if (result.error) {
      console.error('[PKCE] Code exchange failed:', result.error);

      // If the standard exchange fails, try a manual approach
      console.log('[PKCE] Attempting manual code exchange...');

      // This will manually construct the request if the standard one fails
      const manualResult = await supabase.auth.updateSession({
        refresh_token: code, // Try using the code as a refresh token as fallback
      });

      if (!manualResult.error) {
        console.log('[PKCE] Manual exchange succeeded');
        return manualResult;
      }
    }

    return result;
  } catch (error) {
    console.error('[PKCE] Code exchange error:', error);
    return { data: { session: null }, error };
  } finally {
    // Don't clear verifier immediately in case we need it for retries
    setTimeout(() => {
      clearPKCEVerifier();
    }, 5000);
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