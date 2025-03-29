
import { supabase } from '@/lib/supabase';

export async function debugAuthSession() {
  // Get current session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  console.log("Current session:", sessionData?.session ? "exists" : "null");
  
  if (sessionError) {
    console.error("Session error:", sessionError);
    return false;
  }
  
  if (!sessionData?.session) {
    console.error("No active session found");
    return false;
  }

  // Test a simple authenticated request
  const { data: testData, error: testError } = await supabase
    .from('users')
    .select('id')
    .limit(1);
  
  if (testError) {
    console.error("Auth test failed:", testError);
    return false;
  }
  
  console.log("Auth test successful:", testData);
  return true;
}

export async function refreshAuthToken() {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
    console.log("Token refreshed successfully");
    return true;
  } catch (err) {
    console.error("Token refresh exception:", err);
    return false;
  }
}
