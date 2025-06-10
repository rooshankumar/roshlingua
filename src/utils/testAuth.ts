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
 * Determines overall authentication status
 */
const getOverallStatus = (summary: any) => {
  if (summary.isAuthenticated && summary.apiAccessWorking) {
    return 'HEALTHY';
  } else if (summary.hasAuthCode || summary.hasVerifier) {
    return 'IN_PROGRESS';
  } else if (summary.hasAuthError) {
    return 'ERROR';
  } else {
    return 'NOT_AUTHENTICATED';
  }
};

/**
 * Performs a test login with clean state
 */
export const testCleanLogin = async () => {
  console.group('🧪 Clean Login Test');

  // Step 1: Clear all existing auth data
  console.log('Step 1: Clearing all auth data...');
  clearAllAuthData();

  // Step 2: Generate new PKCE verifier
  console.log('Step 2: Generating new PKCE verifier...');
  const verifier = generateVerifier();
  storePKCEVerifier(verifier);

  // Step 3: Initiate sign in
  console.log('Step 3: Initiating sign in...');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });

  if (error) {
    console.error('Sign in error:', error);
    return { success: false, error };
  }

  console.log('Sign in initiated successfully');
  console.groupEnd();
  return { success: true };
};ata();

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

/**
 * Utilities for testing and debugging Supabase authentication and realtime connections
 */

/**
 * Safely unsubscribe from a channel and handle any errors
 * @param channel The channel to unsubscribe from
 */
export const safeUnsubscribe = (channel) => {
  if (!channel) return;

  try {
    channel.unsubscribe();
    console.log('Successfully unsubscribed from channel');
  } catch (error) {
    console.error('Error unsubscribing from channel:', error);
  }
};

/**
 * Check if a channel is already subscribed
 * @param channel The channel to check
 * @returns Boolean indicating if the channel is subscribed
 */
export const isChannelSubscribed = (channel) => {
  if (!channel) return false;

  // Check if the channel has already been subscribed
  return channel.state === 'SUBSCRIBED';
};

/**
 * Create a unique channel ID to prevent duplicate subscriptions
 * @param baseId The base ID for the channel
 * @returns A unique channel ID with timestamp
 */
export const createUniqueChannelId = (baseId) => {
  return `${baseId}:${Date.now()}`;
};

/**
 * Test user presence by updating the user's online status
 * @param userId The user ID to update
 * @param isOnline Whether the user is online or offline
 */
export const updateUserPresence = async (userId, isOnline = true) => {
  if (!userId) return;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_online: isOnline, last_seen: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
    console.log(`User presence updated: ${isOnline ? 'online' : 'offline'}`);
  } catch (err) {
    console.error('Error updating user presence:', err);
  }
};

/**
 * Register event listeners for page visibility changes
 * @param userId The user ID to update
 */
export const setupPresenceEventListeners = (userId) => {
  if (!userId) return;

  // Update status when page becomes hidden or visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      updateUserPresence(userId, false);
    } else if (document.visibilityState === 'visible') {
      updateUserPresence(userId, true);
    }
  });

  // Update status before page unload
  window.addEventListener('beforeunload', () => {
    updateUserPresence(userId, false);
  });
};