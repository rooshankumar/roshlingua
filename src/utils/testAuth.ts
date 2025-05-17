/**
 * A comprehensive utility to test and diagnose authentication issues
 */
import { supabase } from '@/lib/supabase';
import { clearAllAuthData } from './authDebugger';
import { generateVerifier, storePKCEVerifier, getPKCEVerifier } from './pkceHelper';
import { debugAuth, diagnoseAuthUrl } from './authDebugger';

/**
 * Runs a full diagnostic test on authentication status and configuration
 */
export const testAuth = async () => {
  console.group('🔍 Authentication Diagnostic Test');

  // Step 1: Check current auth state
  console.log('Step 1: Checking current authentication state...');
  const { data: sessionData } = await supabase.auth.getSession();
  const isAuthenticated = !!sessionData.session;
  console.log('Authentication status:', isAuthenticated ? 'Authenticated' : 'Not authenticated');

  if (isAuthenticated) {
    console.log('User ID:', sessionData.session?.user.id);
    console.log('Session expires:', new Date(sessionData.session?.expires_at! * 1000).toLocaleString());
  }

  // Step 2: Check storage for PKCE verifiers
  console.log('Step 2: Checking PKCE verifier status...');
  const verifier = getPKCEVerifier();
  console.log('PKCE verifier present:', !!verifier);

  // Step 3: Check URL for auth parameters
  console.log('Step 3: Analyzing current URL...');
  const urlDiagnosis = diagnoseAuthUrl();
  console.log('URL contains auth code:', urlDiagnosis.hasCode);
  console.log('URL contains error:', urlDiagnosis.hasError);

  // Step 4: Test a sample authenticated request
  console.log('Step 4: Testing authenticated API request...');
  const { error: apiError } = await supabase.from('profiles').select('id').limit(1);
  console.log('API request status:', apiError ? 'Failed' : 'Successful');
  if (apiError) console.error('API error:', apiError.message);

  // Step 5: Run full debug
  console.log('Step 5: Running comprehensive auth debug...');
  const debugResults = debugAuth();

  // Step 6: Summary
  console.log('Step 6: Diagnostic summary');
  const summary = {
    isAuthenticated,
    hasVerifier: !!verifier,
    hasAuthCode: urlDiagnosis.hasCode,
    hasAuthError: urlDiagnosis.hasError,
    apiAccessWorking: !apiError,
    localStorageItems: debugResults.authKeys.length,
    storageMechanismsIntact: debugResults.hasVerifier && debugResults.hasSession
  };

  console.log('Diagnostic summary:', summary);
  console.log('Overall status:', getOverallStatus(summary));

  console.groupEnd();

  return {
    ...summary,
    sessionData: sessionData.session,
    debugDetails: debugResults
  };
};

/**
 * Performs a test login with clean state
 */
export const testCleanLogin = async () => {
  console.group('🧪 Clean Login Test');

  // Step 1: Clear all existing auth data
  console.log('Step 1: Clearing all auth data...');
  clearAllAuthData();

  // Step 2: Generate a new verifier
  console.log('Step 2: Generating new PKCE verifier...');
  const verifier = generateVerifier();
  console.log('Verifier created:', verifier.substring(0, 8) + '...');

  // Step 3: Store the verifier in all locations
  console.log('Step 3: Storing verifier...');
  storePKCEVerifier(verifier);

  // Step 4: Initiate login
  console.log('Step 4: Initiating Google login flow...');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?test=clean`,
      queryParams: {
        prompt: 'select_account'
      }
    }
  });

  console.log('Login flow initiated:', !!data.url);
  if (error) console.error('Login initialization error:', error);

  console.groupEnd();

  return {
    success: !!data.url && !error,
    verifier: verifier.substring(0, 8) + '...',
    error: error
  };
};

/**
 * Get a human-readable assessment of auth state
 */
const getOverallStatus = (summary: any) => {
  if (summary.isAuthenticated && summary.apiAccessWorking) {
    return '✅ Authentication working correctly';
  } else if (summary.isAuthenticated && !summary.apiAccessWorking) {
    return '⚠️ Authenticated but API access failing - possible token issue';
  } else if (summary.hasAuthCode && !summary.isAuthenticated) {
    return '❌ Auth code present but not authenticated - PKCE verification likely failed';
  } else if (summary.hasAuthError) {
    return '❌ Authentication error detected in URL';
  } else if (!summary.storageMechanismsIntact) {
    return '⚠️ Storage inconsistency detected - PKCE state may be corrupted';
  } else {
    return '📝 Not authenticated, but no specific issues detected';
  }
};

// Export as default and named exports for flexibility
export default testAuth;