
import { generateVerifier, storePKCEVerifier, getPKCEVerifier, clearPKCEVerifier } from './pkceHelper';
import { supabase } from '@/lib/supabase';

/**
 * Provides comprehensive logging of PKCE state
 */
export const logPKCEState = () => {
  console.group('PKCE Debug Info');
  
  // Check localStorage
  const localVerifier = localStorage.getItem('supabase.auth.code_verifier');
  console.log('localStorage verifier:', localVerifier ? 
    `${localVerifier.substring(0, 5)}... (${localVerifier.length} chars)` : 'NOT FOUND');
  
  // Check sessionStorage
  const sessionVerifier = sessionStorage.getItem('supabase.auth.code_verifier');
  console.log('sessionStorage verifier:', sessionVerifier ? 
    `${sessionVerifier.substring(0, 5)}... (${sessionVerifier.length} chars)` : 'NOT FOUND');
  
  // Check cookies
  const cookies = document.cookie.split(';');
  let cookieVerifier = null;
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'pkce_verifier') {
      cookieVerifier = value;
      break;
    }
  }
  console.log('Cookie verifier:', cookieVerifier ? 
    `${cookieVerifier.substring(0, 5)}... (${cookieVerifier.length} chars)` : 'NOT FOUND');
  
  // Check URL for code param
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  console.log('URL code param:', code ? 
    `${code.substring(0, 5)}... (${code.length} chars)` : 'NOT FOUND');
  
  // Check supabase session
  const session = supabase.auth.session;
  console.log('Supabase session:', session ? 'ACTIVE' : 'NONE');
  
  console.groupEnd();
  
  return {
    hasLocalVerifier: !!localVerifier,
    hasSessionVerifier: !!sessionVerifier,
    hasCookieVerifier: !!cookieVerifier,
    hasCode: !!code,
    hasSession: !!session,
    verifierLength: localVerifier?.length || sessionVerifier?.length || cookieVerifier?.length || 0
  };
};

/**
 * Performs a clean test of the PKCE flow
 */
export const testPKCEFlow = async () => {
  console.group('PKCE Flow Test');
  
  // 1. Clear existing state
  console.log('1. Clearing existing PKCE state...');
  clearPKCEVerifier();
  await supabase.auth.signOut({ scope: 'local' });
  
  // 2. Generate new verifier
  console.log('2. Generating new verifier...');
  const verifier = generateVerifier();
  console.log('   Generated:', verifier.substring(0, 5) + '...');
  
  // 3. Store in all locations
  console.log('3. Storing verifier in all locations...');
  storePKCEVerifier(verifier);
  
  // 4. Verify storage
  console.log('4. Verifying storage:');
  const storedVerifier = getPKCEVerifier();
  console.log('   Retrieved verifier matches:', storedVerifier === verifier);
  
  // 5. Initiate OAuth flow
  console.log('5. Starting OAuth flow...');
  console.log('   Redirecting to Google sign-in...');
  
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?test=manual`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
  
  console.groupEnd();
};

/**
 * Emergency recovery for missing verifier
 */
export const emergencyVerifierRecovery = () => {
  console.group('Emergency Verifier Recovery');
  
  // Get all keys from storage
  const localStorageKeys = Object.keys(localStorage);
  const sessionStorageKeys = Object.keys(sessionStorage);
  
  console.log('Scanning localStorage keys:', localStorageKeys.length);
  console.log('Scanning sessionStorage keys:', sessionStorageKeys.length);
  
  // Look for anything that might be a verifier
  const potentialVerifiers = new Map();
  
  // Check localStorage
  for (const key of localStorageKeys) {
    const value = localStorage.getItem(key);
    if (value && value.length > 20) {
      console.log(`Potential verifier in localStorage[${key}]:`, 
        value.substring(0, 5) + '... (' + value.length + ' chars)');
      potentialVerifiers.set(key, value);
    }
  }
  
  // Check sessionStorage
  for (const key of sessionStorageKeys) {
    const value = sessionStorage.getItem(key);
    if (value && value.length > 20) {
      console.log(`Potential verifier in sessionStorage[${key}]:`, 
        value.substring(0, 5) + '... (' + value.length + ' chars)');
      potentialVerifiers.set(key, value);
    }
  }
  
  console.log('Found', potentialVerifiers.size, 'potential verifiers');
  
  // Try to restore from any source
  if (potentialVerifiers.size > 0) {
    // Prefer keys with "verifier" or "pkce" in the name
    const preferredKeys = Array.from(potentialVerifiers.keys()).filter(
      key => key.includes('verifier') || key.includes('pkce') || key.includes('code_')
    );
    
    if (preferredKeys.length > 0) {
      const key = preferredKeys[0];
      const value = potentialVerifiers.get(key);
      console.log('Restoring verifier from', key);
      storePKCEVerifier(value);
      console.log('Verifier restored successfully');
      console.groupEnd();
      return true;
    } else {
      // Use the first one as last resort
      const [key, value] = potentialVerifiers.entries().next().value;
      console.log('Restoring verifier from', key, '(last resort)');
      storePKCEVerifier(value);
      console.log('Verifier restored as last resort');
      console.groupEnd();
      return true;
    }
  }
  
  console.log('No viable verifiers found');
  console.groupEnd();
  return false;
};
