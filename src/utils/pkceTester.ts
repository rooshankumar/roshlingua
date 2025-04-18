
import { supabase } from '@/lib/supabase';
import { getPKCEVerifier, storePKCEVerifier, generateVerifier, clearPKCEVerifier } from './pkceHelper';

/**
 * Tests PKCE verifier storage across different storage mechanisms
 */
export const testPKCEStorage = () => {
  console.group('PKCE Storage Test');
  
  // Clear existing verifiers
  clearPKCEVerifier();
  console.log('Cleared all verifiers');
  
  // Check initial state
  const initialVerifier = getPKCEVerifier();
  console.log('Initial state:', initialVerifier ? 'Verifier found (unexpected)' : 'No verifier found (expected)');
  
  // Generate and store a test verifier
  const testVerifier = generateVerifier();
  console.log('Generated test verifier:', testVerifier.substring(0, 5) + '...');
  
  // Store the verifier
  storePKCEVerifier(testVerifier);
  console.log('Stored test verifier in all locations');
  
  // Now check if we can retrieve it
  const retrievedVerifier = getPKCEVerifier();
  console.log('Retrieved verifier:', retrievedVerifier ? 'Success' : 'Failed');
  console.log('Verification:', retrievedVerifier === testVerifier ? 'Exact match' : 'Mismatch');
  
  // Check individual storage locations
  console.log('localStorage:', localStorage.getItem('supabase.auth.code_verifier') === testVerifier);
  console.log('sessionStorage:', sessionStorage.getItem('supabase.auth.code_verifier') === testVerifier);
  
  // Check cookie
  const hasCookie = document.cookie.includes('pkce_verifier=');
  console.log('Cookie:', hasCookie ? 'Present' : 'Missing');
  
  console.groupEnd();
  
  return {
    success: retrievedVerifier === testVerifier,
    original: testVerifier,
    retrieved: retrievedVerifier
  };
};

/**
 * Tests authentication redirect (use with caution - will redirect the user)
 */
export const testAuthRedirect = async () => {
  console.log('Starting test auth redirect...');
  
  // Clear any existing values
  clearPKCEVerifier();
  
  // Generate a verifier we control
  const testVerifier = generateVerifier();
  console.log('Generated test verifier:', testVerifier.substring(0, 5) + '...');
  
  // Store it in all locations
  storePKCEVerifier(testVerifier);
  
  // Ensure Supabase also has it
  localStorage.setItem('supabase.auth.code_verifier', testVerifier);
  
  // Log for confirmation
  console.log('Verifier stored before redirect. Starting sign-in...');
  
  // Perform the sign-in
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?test=1`,
    }
  });
};

/**
 * Decodes and inspects a PKCE auth URL (for debugging)
 */
export const decodePKCEParams = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    const params = new URLSearchParams(parsedUrl.search);
    
    // Get important parameters
    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    
    console.group('PKCE URL Inspection');
    console.log('URL:', parsedUrl.pathname);
    console.log('Has code:', !!code);
    console.log('Has error:', !!error);
    if (code) console.log('Code:', code.substring(0, 5) + '...');
    if (error) console.log('Error:', error);
    if (errorDescription) console.log('Error description:', errorDescription);
    
    // Check for verifier
    const verifier = getPKCEVerifier();
    console.log('Verifier present:', !!verifier);
    if (verifier) console.log('Verifier length:', verifier.length);
    
    console.groupEnd();
    
    return { code, error, errorDescription, hasVerifier: !!verifier };
  } catch (err) {
    console.error('Error decoding PKCE URL:', err);
    return { error: 'Invalid URL format' };
  }
};
