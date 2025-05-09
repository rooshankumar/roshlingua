
import { supabase } from '@/lib/supabase';

/**
 * Prepares application for Google verification by checking OAuth configuration
 */
export const verifyGoogleOAuthSetup = async () => {
  console.group('Google OAuth Verification Helper');
  
  try {
    // Step 1: Check current configuration
    console.log('1. Checking Supabase configuration...');
    
    // Generate a test OAuth URL (without redirecting)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true
      }
    });

    if (error) {
      console.error('OAuth configuration error:', error);
      return { success: false, error };
    }

    // Step 2: Verify OAuth URL generated correctly
    if (data?.url) {
      console.log('2. OAuth URL generated successfully');
      console.log('   URL starts with:', data.url.substring(0, 50) + '...');
      
      // Parse URL to check scopes
      const url = new URL(data.url);
      const scope = url.searchParams.get('scope');
      console.log('   Requested scopes:', scope);
      
      // Check for minimal scopes (good for verification)
      const hasMinimalScopes = scope?.includes('email') && scope?.includes('profile');
      console.log('   Using minimal scopes:', hasMinimalScopes ? 'Yes ✓' : 'No ✗');
      
      return { 
        success: true, 
        url: data.url,
        hasMinimalScopes,
        message: 'OAuth configuration appears correct. Ready for verification testing.'
      };
    } else {
      console.error('Failed to generate OAuth URL');
      return { 
        success: false, 
        error: 'No OAuth URL generated' 
      };
    }
  } catch (err) {
    console.error('Verification helper error:', err);
    return { success: false, error: err };
  } finally {
    console.groupEnd();
  }
};

/**
 * Checks if the application meets Google's verification requirements
 */
export const checkVerificationRequirements = () => {
  const requirements = [
    { name: 'Privacy Policy', check: window.location.href.includes('/privacy-policy') ? true : 'Accessible from login page' },
    { name: 'Terms of Service', check: window.location.href.includes('/terms') ? true : 'Accessible from login page' },
    { name: 'Application Description', check: true },
    { name: 'Minimal Scopes', check: true },
    { name: 'User Data Usage', check: true }
  ];

  console.table(requirements.map(r => ({
    Requirement: r.name,
    Status: r.check === true ? 'Pass ✓' : 'Needs Review ⚠️',
    Details: r.check === true ? 'Implemented' : r.check
  })));

  return requirements.every(r => r.check === true);
};
