
import { supabase } from '@/lib/supabase';

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
  
  // Log for debugging (will help identify if verifier is found and where)
  console.log('PKCE Verifier found:', !!verifier, verifier ? `Length: ${verifier.length}` : 'Not found');
  
  return verifier;
};

/**
 * Stores the PKCE code verifier in all available storage mechanisms
 * @param verifier The PKCE code verifier to store
 */
export const storePKCEVerifier = (verifier: string): void => {
  if (!verifier) {
    console.error('Attempted to store empty PKCE verifier');
    return;
  }
  
  try {
    console.log('Storing PKCE verifier in all storage locations');
    
    // Store in multiple locations for redundancy
    localStorage.setItem('supabase.auth.code_verifier', verifier);
    sessionStorage.setItem('supabase.auth.code_verifier', verifier);
    
    // Use a longer expiration for the cookie (30 minutes)
    document.cookie = `pkce_verifier=${verifier};max-age=1800;path=/;SameSite=Lax`;
    
    // Verify storage was successful
    const stored = getPKCEVerifier();
    console.log('PKCE verifier storage verification:', !!stored);
  } catch (err) {
    console.error("Failed to store PKCE verifier:", err);
  }
};

/**
 * Clears PKCE verifier from all storage mechanisms
 */
export const clearPKCEVerifier = (): void => {
  try {
    console.log('Clearing PKCE verifier from all storage locations');
    localStorage.removeItem('supabase.auth.code_verifier');
    sessionStorage.removeItem('supabase.auth.code_verifier');
    document.cookie = 'pkce_verifier=;max-age=0;path=/;';
  } catch (err) {
    console.error("Failed to clear PKCE verifier:", err);
  }
};

/**
 * Captures the PKCE verifier when Supabase generates it during signInWithOAuth
 * This should be called before initiating OAuth flow
 */
export const capturePKCEVerifier = (): void => {
  // Hook into localStorage.setItem to capture when Supabase stores the verifier
  const originalSetItem = localStorage.setItem;
  
  localStorage.setItem = function(key, value) {
    // Call the original implementation first
    originalSetItem.apply(this, [key, value]);
    
    // If this is the PKCE verifier being set by Supabase, store it in all locations
    if (key === 'supabase.auth.code_verifier' && value) {
      console.log('Captured PKCE verifier from Supabase');
      // Store in session storage and cookie as backup
      sessionStorage.setItem(key, value);
      document.cookie = `pkce_verifier=${value};max-age=1800;path=/;SameSite=Lax`;
    }
  };
};

/**
 * Handles PKCE auth code exchange with enhanced error recovery
 * @param code The authorization code from the URL
 * @returns The session data and any errors
 */
export const exchangeAuthCode = async (code: string) => {
  console.log('Attempting to exchange auth code for session');
  
  // Ensure we have a verifier
  const verifier = getPKCEVerifier();
  
  if (!verifier) {
    console.error("No code verifier found for PKCE exchange");
    return { data: { session: null }, error: new Error("Missing code verifier") };
  }
  
  // Make sure verifier is in localStorage where Supabase expects it
  localStorage.setItem('supabase.auth.code_verifier', verifier);
  
  // Attempt the exchange
  try {
    console.log('Exchanging code for session with verifier length:', verifier.length);
    const result = await supabase.auth.exchangeCodeForSession(code);
    
    if (result.error) {
      console.error('Code exchange failed:', result.error);
    } else {
      console.log('Code exchange successful');
      // Clear verifier after successful exchange
      clearPKCEVerifier();
    }
    
    return result;
  } catch (error) {
    console.error("Error in code exchange:", error);
    return { data: { session: null }, error };
  }
};
