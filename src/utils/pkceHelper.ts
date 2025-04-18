
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
  
  return verifier;
};

/**
 * Stores the PKCE code verifier in all available storage mechanisms
 * @param verifier The PKCE code verifier to store
 */
export const storePKCEVerifier = (verifier: string): void => {
  if (!verifier) return;
  
  try {
    // Store in multiple locations for redundancy
    localStorage.setItem('supabase.auth.code_verifier', verifier);
    sessionStorage.setItem('supabase.auth.code_verifier', verifier);
    
    // Cookie as last resort (expires in 10 minutes)
    document.cookie = `pkce_verifier=${verifier};max-age=600;path=/;SameSite=Lax`;
  } catch (err) {
    console.error("Failed to store PKCE verifier:", err);
  }
};

/**
 * Clears PKCE verifier from all storage mechanisms
 */
export const clearPKCEVerifier = (): void => {
  try {
    localStorage.removeItem('supabase.auth.code_verifier');
    sessionStorage.removeItem('supabase.auth.code_verifier');
    document.cookie = 'pkce_verifier=;max-age=0;path=/;';
  } catch (err) {
    console.error("Failed to clear PKCE verifier:", err);
  }
};

/**
 * Handles PKCE auth code exchange with enhanced error recovery
 * @param code The authorization code from the URL
 * @returns The session data and any errors
 */
export const exchangeAuthCode = async (code: string) => {
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
    return await supabase.auth.exchangeCodeForSession(code);
  } catch (error) {
    console.error("Error in code exchange:", error);
    return { data: { session: null }, error };
  }
};
