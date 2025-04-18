
import { supabase } from '@/lib/supabase';

/**
 * Generate a random string suitable for use as a PKCE verifier
 */
export const generateVerifier = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Gets the PKCE code verifier from all available storage mechanisms
 * @returns The code verifier or null if not found
 */
export const getPKCEVerifier = (): string | null => {
  // Try localStorage first (primary storage)
  let verifier = localStorage.getItem('supabase.auth.code_verifier');
  
  // If not in localStorage, try sessionStorage
  if (!verifier) {
    verifier = sessionStorage.getItem('supabase.auth.code_verifier');
  }
  
  // If still not found, try cookie backup
  if (!verifier) {
    const cookies = document.cookie.split('; ');
    const verifierCookie = cookies.find(row => row.startsWith('pkce_verifier='));
    if (verifierCookie) {
      verifier = verifierCookie.split('=')[1];
    }
  }
  
  // Also check alternate locations
  if (!verifier) {
    verifier = localStorage.getItem('code_verifier') || 
               sessionStorage.getItem('code_verifier') ||
               localStorage.getItem('sb-pkce-verifier');
  }
  
  // Log for debugging (will help identify if verifier is found and where)
  console.log('[PKCE] Verifier found:', !!verifier, verifier ? `Length: ${verifier.length}` : 'Not found');
  
  return verifier;
};

/**
 * Stores the PKCE code verifier in all available storage mechanisms
 * @param verifier The PKCE code verifier to store
 */
export const storePKCEVerifier = (verifier: string): void => {
  if (!verifier) {
    console.error('[PKCE] Attempted to store empty PKCE verifier');
    return;
  }
  
  try {
    console.log('[PKCE] Storing verifier in all storage locations:', verifier.substring(0, 5) + '...');
    
    // Store in multiple locations for redundancy
    localStorage.setItem('supabase.auth.code_verifier', verifier);
    localStorage.setItem('code_verifier', verifier);  // Alternate location
    localStorage.setItem('sb-pkce-verifier', verifier);  // Another alternate
    
    sessionStorage.setItem('supabase.auth.code_verifier', verifier);
    sessionStorage.setItem('code_verifier', verifier);
    
    // Use a longer expiration for the cookie (30 minutes)
    document.cookie = `pkce_verifier=${verifier};max-age=1800;path=/;SameSite=Lax`;
    
    // Store a session identifier to help with recovery
    const sessionId = Math.random().toString(36).substring(2);
    localStorage.setItem('auth_session_id', sessionId);
    localStorage.setItem(`pkce_verifier_${sessionId}`, verifier);
    
    // Verify storage was successful
    const stored = getPKCEVerifier();
    console.log('[PKCE] Verifier storage verification:', !!stored);
  } catch (err) {
    console.error("[PKCE] Failed to store PKCE verifier:", err);
  }
};

/**
 * Clears PKCE verifier from all storage mechanisms
 */
export const clearPKCEVerifier = (): void => {
  try {
    console.log('[PKCE] Clearing verifier from all storage locations');
    
    localStorage.removeItem('supabase.auth.code_verifier');
    localStorage.removeItem('code_verifier');
    localStorage.removeItem('sb-pkce-verifier');
    
    sessionStorage.removeItem('supabase.auth.code_verifier');
    sessionStorage.removeItem('code_verifier');
    
    document.cookie = 'pkce_verifier=;max-age=0;path=/;';
    
    // Also clear session-specific storage
    const sessionId = localStorage.getItem('auth_session_id');
    if (sessionId) {
      localStorage.removeItem(`pkce_verifier_${sessionId}`);
      localStorage.removeItem('auth_session_id');
    }
  } catch (err) {
    console.error("[PKCE] Failed to clear PKCE verifier:", err);
  }
};

/**
 * Captures the PKCE verifier when Supabase generates it during signInWithOAuth
 * This should be called before initiating OAuth flow
 */
export const capturePKCEVerifier = (): void => {
  console.log('[PKCE] Setting up verifier capture');
  
  // Generate a backup verifier in case Supabase doesn't generate one
  const backupVerifier = generateVerifier();
  
  // Hook into localStorage.setItem to capture when Supabase stores the verifier
  const originalSetItem = localStorage.setItem;
  
  localStorage.setItem = function(key, value) {
    // Call the original implementation first
    originalSetItem.apply(this, [key, value]);
    
    console.log(`[PKCE] localStorage set: ${key}`);
    
    // If this is the PKCE verifier being set by Supabase, store it in all locations
    if (key === 'supabase.auth.code_verifier' && value) {
      console.log('[PKCE] Captured verifier from Supabase:', value.substring(0, 5) + '...');
      storePKCEVerifier(value);
    }
  };
  
  // If Supabase doesn't set a verifier within 1 second, use our backup
  setTimeout(() => {
    const verifier = getPKCEVerifier();
    if (!verifier) {
      console.log('[PKCE] No verifier set by Supabase, using backup');
      storePKCEVerifier(backupVerifier);
    }
  }, 1000);
};

/**
 * Handles PKCE auth code exchange with enhanced error recovery
 * @param code The authorization code from the URL
 * @returns The session data and any errors
 */
export const exchangeAuthCode = async (code: string) => {
  console.log('[PKCE] Attempting to exchange auth code for session');
  
  if (!code) {
    console.error("[PKCE] Missing auth code for exchange");
    return { data: { session: null }, error: new Error("Missing auth code") };
  }
  
  // Ensure we have a verifier
  let verifier = getPKCEVerifier();
  
  if (!verifier) {
    console.error("[PKCE] No code verifier found for PKCE exchange");
    
    // Last resort: generate a new verifier (might not work but worth trying)
    verifier = generateVerifier();
    console.log("[PKCE] Generated emergency verifier:", verifier.substring(0, 5) + "...");
    storePKCEVerifier(verifier);
  }
  
  // Make sure verifier is in localStorage where Supabase expects it
  localStorage.setItem('supabase.auth.code_verifier', verifier);
  
  // Attempt the exchange
  try {
    console.log('[PKCE] Exchanging code with verifier length:', verifier.length);
    console.log('[PKCE] Code:', code.substring(0, 5) + '...', 'Verifier:', verifier.substring(0, 5) + '...');
    
    const result = await supabase.auth.exchangeCodeForSession(code);
    
    if (result.error) {
      console.error('[PKCE] Code exchange failed:', result.error);
    } else {
      console.log('[PKCE] Code exchange successful');
      // Clear verifier after successful exchange
      clearPKCEVerifier();
    }
    
    return result;
  } catch (error) {
    console.error("[PKCE] Error in code exchange:", error);
    return { data: { session: null }, error };
  }
};
