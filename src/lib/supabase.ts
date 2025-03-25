
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://yekzyvdjjozhhatdefsq.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlla3p5dmRqam96aGhhdGRlZnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDk5NjEsImV4cCI6MjA1ODI4NTk2MX0.6z2QW9PnENnT9knd9oK8Sbqf2JhN1NsKIKs6hG4vM8Q";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

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
  // Update online status before signing out
  const user = (await supabase.auth.getUser()).data.user;
  if (user) {
    await supabase
      .from('profiles')
      .update({ is_online: false })
      .eq('id', user.id);
  }
  
  return await supabase.auth.signOut();
};

// Helper function to get current session
export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error getting session:", error);
    return null;
  }
  return data.session;
};

// Helper function to get current user
export const getCurrentUser = async () => {
  const session = await getCurrentSession();
  return session?.user || null;
};

// Function to update user's online status
export const updateOnlineStatus = async (userId: string, isOnline: boolean) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_online: isOnline })
      .eq('id', userId);
      
    if (error) {
      console.error("Failed to update online status:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error updating online status:", error);
    return false;
  }
};

// Function to update user streak
export const updateUserStreak = async (userId: string) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get current streak info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('streak_count, streak_last_date')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error("Failed to get user streak data:", userError);
      return false;
    }
    
    // Check if we need to update the streak
    if (!userData.streak_last_date || userData.streak_last_date !== today) {
      const streakCount = 
        !userData.streak_last_date || isYesterday(userData.streak_last_date) 
          ? (userData.streak_count || 0) + 1 
          : 1;
          
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          streak_count: streakCount,
          streak_last_date: today
        })
        .eq('id', userId);
        
      if (updateError) {
        console.error("Failed to update user streak:", updateError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error updating user streak:", error);
    return false;
  }
};

// Helper to check if a date is yesterday
function isYesterday(dateString: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString().split('T')[0];
  return dateString === yesterdayString;
}

// Function to create user record manually in the users table
export const createUserRecord = async (userId: string, email: string, fullName: string) => {
  try {
    // Check if the user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (existingUser) {
      console.log("User already exists, updating online status");
      // Update online status for existing user
      await updateOnlineStatus(userId, true);
      return true;
    }
    
    // Call the create_user_with_onboarding function to properly set up the user
    const { data, error } = await supabase.rpc('create_user_with_onboarding', {
      p_user_id: userId,
      p_email: email,
      p_full_name: fullName
    });
    
    if (error) {
      console.error("Failed to create user record:", error);
      
      // Fallback: Try direct insert if RPC fails
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // 1. Try to insert into users table first
        const usersInsert = await supabase
          .from('users')
          .insert({
            id: userId,
            email: email,
            full_name: fullName,
            native_language: 'English',
            learning_language: 'Spanish',
            proficiency_level: 'beginner',
            streak_count: 1,
            streak_last_date: today
          })
          .select();
          
        if (usersInsert.error) throw usersInsert.error;
        
        // 2. Then insert into profiles
        const username = fullName.toLowerCase().replace(/\s+/g, '_');
        const profilesInsert = await supabase
          .from('profiles')
          .insert({
            id: userId,
            username: username,
            bio: `Hi! I'm ${fullName} and I'm learning a new language.`,
            is_online: true
          })
          .select();
          
        if (profilesInsert.error) throw profilesInsert.error;
        
        // 3. Finally insert into onboarding_status
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
    
    // Update online status
    await updateOnlineStatus(userId, true);
    return true;
  } catch (error) {
    console.error("Error in createUserRecord:", error);
    return false;
  }
};

// Function to toggle like on a profile
export const toggleProfileLike = async (loggedInUserId: string, profileId: string) => {
  try {
    // Check if user has already liked this profile
    const { data: existingLike, error: checkError } = await supabase
      .from('user_likes')
      .select('*')
      .eq('liker_id', loggedInUserId)
      .eq('liked_id', profileId)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error which is expected if not liked
      console.error("Error checking existing like:", checkError);
      return false;
    }
    
    let success = false;
    
    // If like exists, remove it
    if (existingLike) {
      const { error: deleteError } = await supabase
        .from('user_likes')
        .delete()
        .eq('liker_id', loggedInUserId)
        .eq('liked_id', profileId);
        
      if (deleteError) {
        console.error("Error removing like:", deleteError);
        return false;
      }
      
      // Decrement like count on profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ likes_count: supabase.rpc('decrement', { x: 1 }) })
        .eq('id', profileId);
        
      if (updateError) {
        console.error("Error updating profile like count:", updateError);
        return false;
      }
      
      success = true;
    } 
    // If no like exists, add it
    else {
      const { error: insertError } = await supabase
        .from('user_likes')
        .insert({
          liker_id: loggedInUserId,
          liked_id: profileId
        });
        
      if (insertError) {
        console.error("Error adding like:", insertError);
        return false;
      }
      
      // Increment like count on profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ likes_count: supabase.rpc('increment', { x: 1 }) })
        .eq('id', profileId);
        
      if (updateError) {
        console.error("Error updating profile like count:", updateError);
        return false;
      }
      
      success = true;
    }
    
    return success;
  } catch (error) {
    console.error("Error toggling profile like:", error);
    return false;
  }
};

// Function to check if a user has liked a profile
export const hasUserLikedProfile = async (loggedInUserId: string, profileId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_likes')
      .select('*')
      .eq('liker_id', loggedInUserId)
      .eq('liked_id', profileId)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error("Error checking if user liked profile:", error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Error in hasUserLikedProfile:", error);
    return false;
  }
};
