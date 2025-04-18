
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
