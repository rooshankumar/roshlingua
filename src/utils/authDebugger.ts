/**
 * Utility for debugging authentication issues
 */

export const clearAllAuthData = () => {
  console.log('Clearing all auth data...');

  // Clear localStorage
  localStorage.removeItem('supabase.auth.token');
  localStorage.removeItem('supabase.auth.code_verifier');
  localStorage.removeItem('code_verifier');
  localStorage.removeItem('sb-pkce-verifier');
  localStorage.removeItem('auth_session_id');
  localStorage.removeItem('supabase_device_id');

  // Clear sessionStorage
  sessionStorage.removeItem('supabase.auth.token');
  sessionStorage.removeItem('supabase.auth.code_verifier');
  sessionStorage.removeItem('code_verifier');

  // Clear cookies
  document.cookie = 'sb-auth-token=; max-age=0; path=/; domain=' + window.location.hostname;
  document.cookie = 'pkce_verifier=; max-age=0; path=/;';

  console.log('Auth data cleared');
  return true;
};

/**
 * Comprehensive auth debugging utility
 */
import { supabase } from '@/lib/supabase';
import { getPKCEVerifier } from './pkceHelper';

export const debugAuth = () => {
  console.group('🔍 Auth Debug Information');

  // Check for PKCE verifier
  const codeVerifier = getPKCEVerifier();
  console.log('PKCE verifier present:', !!codeVerifier);
  if (codeVerifier) {
    console.log('Verifier length:', codeVerifier.length);
    console.log('Verifier first 8 chars:', codeVerifier.substring(0, 8));
  }

  // Check for session
  const sessionStr = localStorage.getItem('supabase.auth.token');
  let session = null;
  try {
    if (sessionStr) {
      session = JSON.parse(sessionStr);
    }
  } catch (e) {
    console.error('Error parsing session:', e);
  }

  console.log('Session present:', !!session);
  if (session) {
    console.log('Session expires at:', new Date(session.expires_at * 1000).toISOString());
    console.log('Session expired:', (session.expires_at * 1000) < Date.now());
  }

  // Check for all auth-related localStorage items
  const authKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('auth') || key.includes('supabase'))) {
      authKeys.push(key);
    }
  }
  console.log('Auth-related localStorage keys:', authKeys);

  // Check for auth related cookies
  const cookies = document.cookie.split(';').map(c => c.trim());
  const authCookies = cookies.filter(c => 
    c.startsWith('sb-') || 
    c.includes('auth') || 
    c.includes('pkce')
  );
  console.log('Auth-related cookies:', authCookies);

  // Get current session state from Supabase
  supabase.auth.getSession().then(({ data, error }) => {
    console.log('Current Supabase session:', data.session ? 'Active' : 'None');
    if (error) console.error('Error getting session:', error);
    if (data.session) {
      console.log('User ID:', data.session.user.id);
      console.log('Email:', data.session.user.email);
    }
  });

  console.groupEnd();

  return {
    hasVerifier: !!codeVerifier,
    hasSession: !!session,
    authKeys,
    authCookies
  };
};

// Function to diagnose URL for authentication-related info
export const diagnoseAuthUrl = (url = window.location.href) => {
  try {
    const parsedUrl = new URL(url);
    const searchParams = parsedUrl.searchParams;

    console.group('🔍 Auth URL Diagnosis');
    console.log('Path:', parsedUrl.pathname);

    // Check for authentication parameters
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    console.log('Has auth code:', !!code);
    if (code) console.log('Code length:', code.length);

    console.log('Has error:', !!error);
    if (error) console.log('Error:', error);
    if (errorDescription) console.log('Error description:', errorDescription);

    // Check for other auth-related parameters
    const provider = searchParams.get('provider');
    const flow = searchParams.get('flow_type');

    if (provider) console.log('Provider:', provider);
    if (flow) console.log('Flow type:', flow);

    console.groupEnd();

    return {
      hasCode: !!code,
      hasError: !!error,
      errorMessage: errorDescription || error,
      provider,
      flowType: flow
    };
  } catch (err) {
    console.error('Error diagnosing URL:', err);
    return { error: 'Invalid URL format' };
  }
};

// Test function for authentication
export const testAuthFlow = async () => {
  console.group('🧪 Testing Auth Flow');

  // 1. Clear current auth state
  console.log('1. Clearing current auth state...');
  await supabase.auth.signOut();
  clearAllAuthData();

  // 2. Initiate login flow
  console.log('2. Initiating sign-in flow...');
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?test=true`,
        skipBrowserRedirect: true, // We'll handle the redirect manually
      }
    });

    if (error) {
      console.error('Sign-in error:', error);
      console.groupEnd();
      return { success: false, error };
    }

    console.log('OAuth URL generated:', !!data.url);

    // 3. Verify verifier is stored
    const verifier = getPKCEVerifier();
    console.log('3. Verifier stored:', !!verifier);
    if (verifier) {
      console.log('Verifier length:', verifier.length);
    }

    // 4. Ready for redirect
    console.log('4. Ready for redirect. URL:', data.url?.substring(0, 50) + '...');
    console.log('5. Manual redirect required. Copy this URL and open in a new tab:');
    console.log(data.url);

    console.groupEnd();
    return { success: true, url: data.url, verifier };
  } catch (err) {
    console.error('Test auth flow error:', err);
    console.groupEnd();
    return { success: false, error: err };
  }
};

// Export a helper function to quickly debug in the browser console
window.debugAuth = debugAuth;
window.clearAllAuthData = clearAllAuthData;
window.diagnoseAuthUrl = diagnoseAuthUrl;
window.testAuthFlow = testAuthFlow;