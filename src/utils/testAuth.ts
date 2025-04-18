
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
