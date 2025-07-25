/**
 * Comprehensive auth debugging utility
 */
import { supabase } from '@/lib/supabase';
import { getPKCEVerifier } from './pkceHelper';

export const clearAllAuthData = () => {
  console.log('Clearing all auth data...');

  // Clear localStorage
  // Clear all auth-related storage
  const authKeys = Object.keys(localStorage).filter(key => 
    key.includes('auth') || 
    key.includes('supabase') || 
    key.includes('pkce') ||
    key.includes('verifier')
  );
  
  authKeys.forEach(key => localStorage.removeItem(key));
  
  // Clear session storage
  const sessionKeys = Object.keys(sessionStorage).filter(key =>
    key.includes('auth') ||
    key.includes('supabase') ||
    key.includes('pkce') ||
    key.includes('verifier')
  );
  
  sessionKeys.forEach(key => sessionStorage.removeItem(key));

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
    if (key && (key.includes('auth') || key.includes('supabase') || key.includes('pkce'))) {
      authKeys.push({
        key,
        valueLength: localStorage.getItem(key)?.length || 0
      });
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

  // Check current URL for auth parameters
  const url = new URL(window.location.href);
  const urlParams = {};
  url.searchParams.forEach((value, key) => {
    if (key === 'code') {
      urlParams[key] = value.substring(0, 8) + '... (length: ' + value.length + ')';
    } else {
      urlParams[key] = value;
    }
  });
  console.log('URL parameters:', urlParams);

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
    authCookies,
    urlParams
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

// Reset authentication and start a fresh, clean auth flow
export const resetAndStartAuth = async () => {
  console.group('🧹 Resetting Authentication');

  // 1. Sign out from Supabase
  console.log('1. Signing out...');
  await supabase.auth.signOut({ scope: 'global' });

  // 2. Clear all stored auth data
  console.log('2. Clearing auth data...');
  clearAllAuthData();

  // 3. Import necessary functions to re-initiate login
  console.log('3. Initiating fresh sign-in...');
  const { signInWithGoogle } = await import('@/lib/supabase');
  const result = await signInWithGoogle();

  console.log('Sign-in initiated, URL generated:', !!result.data.url);
  console.groupEnd();

  return result;
};

export const debugSupabaseAuth = () => {
  console.group("Supabase Auth Debug");

  // Check for session
  const session = supabase.auth.session;
  console.log("Has session:", !!session);

  // Check local storage for auth data
  const keys = Object.keys(localStorage);
  const authKeys = keys.filter(key => key.includes('supabase.auth') || key.includes('sb-'));
  console.log("Auth keys in localStorage:", authKeys);

  // Log current URL
  console.log("Current URL:", window.location.href);

  // Check for auth params in URL
  const url = new URL(window.location.href);
  console.log("Has 'code' param:", url.searchParams.has('code'));
  console.log("Has 'error' param:", url.searchParams.has('error'));

  // Fix for 406 errors - update the accept header in global config
  const currentHeaders = supabase.rest.headers;
  console.log("Current API headers:", currentHeaders);

  // Update the headers to ensure proper Accept header
  supabase.rest.setHeaders({
    ...currentHeaders,
    'Accept': 'application/json'
  });

  console.log("Updated API headers with proper Accept: application/json");

  console.groupEnd();

  return {
    hasSession: !!session,
    authKeysCount: authKeys.length,
    hasCodeParam: url.searchParams.has('code'),
    hasErrorParam: url.searchParams.has('error')
  };
};

// Export these functions to the global window object for easy debugging
// from browser console
if (typeof window !== 'undefined') {
  window.debugAuth = debugAuth;
  window.clearAllAuthData = clearAllAuthData;
  window.diagnoseAuthUrl = diagnoseAuthUrl;
  window.resetAndStartAuth = resetAndStartAuth;
}r console
if (typeof window !== 'undefined') {
  window.debugAuth = debugAuth;
  window.clearAllAuthData = clearAllAuthData;
  window.diagnoseAuthUrl = diagnoseAuthUrl;
  window.resetAndStartAuth = resetAndStartAuth;
  window.debugSupabaseAuth = debugSupabaseAuth;
}seAuth;
}