
/**
 * A simple utility to test and diagnose authentication
 */
import { supabase } from '@/lib/supabase';

export const testAuth = async () => {
  console.group('Authentication Diagnostic Test');
  
  try {
    // Step 1: Check current session
    console.log('1. Checking current session...');
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('   Current session:', sessionData.session ? 'Active' : 'None');
    
    if (sessionData.session) {
      console.log('   User ID:', sessionData.session.user.id);
      console.log('   Email:', sessionData.session.user.email);
      console.log('   Session expires at:', new Date(sessionData.session.expires_at! * 1000).toLocaleString());
    }
    
    // Step 2: Generate new OAuth URL
    console.log('2. Generating OAuth URL...');
    const { data: signInData } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true 
      }
    });
    
    console.log('   OAuth URL generated:', !!signInData.url);
    if (signInData.url) {
      console.log('   URL starts with:', signInData.url.substring(0, 50) + '...');
    }
    
    // Step 3: Check if code verifier was generated
    console.log('3. Checking code verifier storage...');
    const verifier = localStorage.getItem('supabase.auth.code_verifier');
    console.log('   Code verifier in localStorage:', verifier ? 'Present' : 'Missing');
    
    if (verifier) {
      console.log('   Verifier length:', verifier.length);
    }
    
    console.log('Authentication test complete. If you wish to proceed with sign-in, navigate to:');
    console.log(signInData.url);
  } catch (error) {
    console.error('Error during authentication test:', error);
  }
  
  console.groupEnd();
};

export default testAuth;
import { supabase } from '@/lib/supabase';
import { clearAllAuthData } from './authDebugger';
import { generateVerifier, storePKCEVerifier } from './pkceHelper';

/**
 * Comprehensive authentication test utility
 */
export const testAuth = async () => {
  console.group('Authentication Diagnostic Test');
  
  try {
    // Step 1: Check current session
    console.log('1. Checking current session...');
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('   Current session:', sessionData.session ? 'Active' : 'None');
    
    if (sessionData.session) {
      console.log('   User ID:', sessionData.session.user.id);
      console.log('   Email:', sessionData.session.user.email);
      console.log('   Session expires at:', new Date(sessionData.session.expires_at! * 1000).toLocaleString());
    }
    
    // Step 2: Clear existing state
    console.log('2. Clearing existing auth state...');
    await supabase.auth.signOut();
    clearAllAuthData();
    
    // Step 3: Generate and store a new verifier
    console.log('3. Generating and storing new verifier...');
    const verifier = generateVerifier();
    console.log('   Generated verifier length:', verifier.length);
    
    const stored = storePKCEVerifier(verifier);
    console.log('   Verifier storage successful:', stored);
    
    // Step 4: Generate new OAuth URL
    console.log('4. Generating OAuth URL...');
    const { data: signInData } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: `${window.location.origin}/auth/callback?test=diagnostic`,
        skipBrowserRedirect: true  // Don't redirect automatically
      }
    });
    
    console.log('   OAuth URL generated:', !!signInData.url);
    if (signInData.url) {
      console.log('   URL starts with:', signInData.url.substring(0, 50) + '...');
    }
    
    // Step 5: Check if code verifier was properly stored
    console.log('5. Verifying code verifier storage...');
    const localVerifier = localStorage.getItem('supabase.auth.code_verifier');
    const sessionVerifier = sessionStorage.getItem('supabase.auth.code_verifier');
    
    console.log('   Code verifier in localStorage:', localVerifier ? 'Present' : 'Missing');
    console.log('   Code verifier in sessionStorage:', sessionVerifier ? 'Present' : 'Missing');
    
    if (localVerifier) {
      console.log('   Verifier matches original:', localVerifier === verifier);
      console.log('   Verifier length:', localVerifier.length);
    }
    
    // Step 6: Test summary
    console.log('6. Test summary');
    const success = !!signInData.url && !!localVerifier && localVerifier === verifier;
    console.log('   Overall test result:', success ? 'SUCCESS' : 'FAILURE');
    
    if (!success) {
      console.log('   Failure reasons:');
      if (!signInData.url) console.log('   - Failed to generate OAuth URL');
      if (!localVerifier) console.log('   - Failed to store verifier in localStorage');
      if (localVerifier !== verifier) console.log('   - Stored verifier does not match original');
    }
    
    console.log('7. To complete test, use this URL:');
    console.log(signInData.url);
    
    console.groupEnd();
    return { 
      success, 
      hasSession: !!sessionData.session,
      verifierStored: !!localVerifier,
      oauthUrlGenerated: !!signInData.url,
      url: signInData.url
    };
  } catch (error) {
    console.error('Auth test error:', error);
    console.groupEnd();
    return { 
      success: false, 
      error
    };
  }
};

/**
 * Quick test function to initiate PKCE authentication flow
 */
export const startAuthTest = async () => {
  // Clear any existing state
  await supabase.auth.signOut();
  localStorage.removeItem('supabase.auth.code_verifier');
  sessionStorage.removeItem('supabase.auth.code_verifier');
  
  // Generate and store verifier
  const verifier = generateVerifier();
  console.log('Generated verifier:', verifier.substring(0, 8) + '...');
  localStorage.setItem('supabase.auth.code_verifier', verifier);
  sessionStorage.setItem('supabase.auth.code_verifier', verifier);
  
  // Start OAuth flow
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
};
