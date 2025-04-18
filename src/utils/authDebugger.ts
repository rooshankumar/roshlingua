
/**
 * Utility for debugging authentication issues
 */

export const debugAuth = () => {
  console.group('Auth Debug Information');
  
  // Check for PKCE verifier
  const codeVerifier = localStorage.getItem('supabase.auth.code_verifier');
  console.log('PKCE verifier present:', !!codeVerifier);
  if (codeVerifier) {
    console.log('Verifier length:', codeVerifier.length);
    console.log('Verifier first 5 chars:', codeVerifier.substring(0, 5));
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
  
  // Check for auth related cookies
  const cookies = document.cookie.split(';').map(c => c.trim());
  const authCookies = cookies.filter(c => 
    c.startsWith('sb-') || 
    c.includes('auth') || 
    c.includes('pkce')
  );
  
  console.log('Auth related cookies:', authCookies.length > 0 ? authCookies : 'None');
  
  // Check for URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  console.log('URL has code param:', urlParams.has('code'));
  console.log('URL has error param:', urlParams.has('error'));
  if (urlParams.has('error')) {
    console.log('Error:', urlParams.get('error'));
    console.log('Error description:', urlParams.get('error_description'));
  }
  
  console.groupEnd();
  
  // Return a summary for UI display if needed
  return {
    hasVerifier: !!codeVerifier,
    hasSession: !!session,
    sessionExpired: session ? (session.expires_at * 1000) < Date.now() : null,
    authCookies: authCookies.length,
    hasCodeParam: urlParams.has('code'),
    hasErrorParam: urlParams.has('error')
  };
};

export const clearAllAuthData = () => {
  console.log('Clearing all auth data...');
  
  // Clear localStorage
  localStorage.removeItem('supabase.auth.token');
  localStorage.removeItem('supabase.auth.code_verifier');
  localStorage.removeItem('code_verifier');
  localStorage.removeItem('sb-pkce-verifier');
  localStorage.removeItem('auth_session_id');
  
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

export const debugAuth = () => {
  console.group('🔍 Auth Debug Information');
  
  // Check for PKCE verifier
  const codeVerifier = localStorage.getItem('supabase.auth.code_verifier');
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
  
  console.log('Auth related cookies:', authCookies.length > 0 ? authCookies : 'None');
  
  // Check for URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  console.log('URL has code param:', urlParams.has('code'));
  console.log('URL has error param:', urlParams.has('error'));
  if (urlParams.has('error')) {
    console.log('Error:', urlParams.get('error'));
    console.log('Error description:', urlParams.get('error_description'));
  }
  
  console.groupEnd();
  
  return {
    hasVerifier: !!codeVerifier,
    hasSession: !!session,
    urlHasCode: urlParams.has('code'),
    urlHasError: urlParams.has('error')
  };
};

// Call this function to test the auth system without redirecting
export const testAuthSession = async () => {
  console.group('🧪 Auth Session Test');
  
  try {
    // Check current session
    console.log('Checking current session...');
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (sessionData.session) {
      console.log('✅ Active session found!');
      console.log('User ID:', sessionData.session.user.id);
      console.log('Email:', sessionData.session.user.email);
      console.log('Expires at:', new Date(sessionData.session.expires_at! * 1000).toLocaleString());
    } else {
      console.log('❌ No active session');
    }
    
    console.log('Checking storage state...');
    debugAuth();
    
  } catch (error) {
    console.error('Error testing auth session:', error);
  }
  
  console.groupEnd();
};

// This function clears all auth-related data for a fresh start
export const resetAuth = async () => {
  console.group('🧹 Resetting Auth State');
  
  try {
    // Sign out from Supabase
    console.log('Signing out from Supabase...');
    await supabase.auth.signOut({ scope: 'global' });
    
    // Clear all auth-related localStorage items
    console.log('Clearing localStorage...');
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('auth') || 
        key.includes('supabase') || 
        key.includes('code_verifier') ||
        key.includes('pkce')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Removed: ${key}`);
    });
    
    // Clear sessionStorage too
    console.log('Clearing sessionStorage...');
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.includes('auth') || 
        key.includes('supabase') || 
        key.includes('code_verifier') ||
        key.includes('pkce')
      )) {
        sessionKeysToRemove.push(key);
      }
    }
    
    sessionKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`Removed: ${key}`);
    });
    
    // Clear auth-related cookies
    console.log('Clearing cookies...');
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (
        name.includes('sb-') || 
        name.includes('auth') || 
        name.includes('pkce')
      ) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
        console.log(`Removed cookie: ${name}`);
      }
    });
    
    console.log('✅ Auth state reset complete!');
  } catch (error) {
    console.error('Error resetting auth state:', error);
  }
  
  console.groupEnd();
  return true;
};

// Export a helper function to quickly debug in the browser console
window.debugAuth = debugAuth;
window.resetAuth = resetAuth;
window.testAuthSession = testAuthSession;
