import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const signInWithGoogle = async () => {
  const redirectUrl = window.location.origin + '/auth/callback';

  console.log("Redirecting to Google OAuth with redirectUrl:", redirectUrl);

  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error getting session:", error);
    return null;
  }
  return data.session;
};

export const getCurrentUser = async () => {
  const session = await getCurrentSession();
  return session?.user || null;
};

export const createUserRecord = async (userId: string, email: string, fullName: string) => {
  try {
    const { data, error } = await supabase.rpc('create_user_with_onboarding', {
      p_user_id: userId,
      p_email: email,
      p_full_name: fullName
    });

    if (error) {
      console.error("Failed to create user record:", error);

      try {
        const usersInsert = await supabase
          .from('users')
          .insert({
            id: userId,
            email: email,
            full_name: fullName,
            native_language: 'English',
            learning_language: 'Spanish',
            proficiency_level: 'beginner'
          })
          .select();

        if (usersInsert.error) throw usersInsert.error;

        const profilesInsert = await supabase
          .from('profiles')
          .insert({
            id: userId
          })
          .select();

        if (profilesInsert.error) throw profilesInsert.error;

        const onboardingInsert = await supabase
          .from('onboarding_status')
          .insert({
            user_id: userId,
            is_complete: false
          })
          .select();

        if (onboardingInsert.error) throw onboardingInsert.error;

        console.log("Created user record through fallback method");
        return true;
      } catch (fallbackError) {
        console.error("Fallback user creation also failed:", fallbackError);
        return false;
      }
    }

    console.log("Created user record successfully:", data);
    return true;
  } catch (error) {
    console.error("Error in createUserRecord:", error);
    return false;
  }
};