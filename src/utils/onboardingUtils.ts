
import { supabase } from '@/lib/supabase';

export const checkOnboardingStatus = async (userId: string) => {
  try {
    if (!userId) return { isComplete: false };

    console.log("Checking onboarding status for user:", userId);
    
    // First, check if the profile exists
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Error fetching onboarding status:", error);
      
      // If we got a 404/not found error, the profile might not exist yet
      if (error.code === 'PGRST116') {
        console.log("Profile not found, creating a new profile entry");
        
        try {
          // Create a placeholder profile to ensure onboarding works
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              onboarding_completed: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (createError) {
            console.error("Error creating profile:", createError);
            return { isComplete: false, error: createError };
          }
          
          // Verify profile was created
          const { data: newProfile, error: verifyError } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', userId)
            .single();
            
          if (verifyError) {
            console.error("Error verifying new profile:", verifyError);
            return { isComplete: false, error: verifyError };
          }
          
          return { isComplete: newProfile?.onboarding_completed || false };
        } catch (err) {
          console.error("Error in profile creation process:", err);
          return { isComplete: false, error: err };
        }
      }
      
      return { isComplete: false, error };
    }

    console.log("Onboarding status retrieved:", data?.onboarding_completed);
    return { 
      isComplete: data?.onboarding_completed || false
    };
  } catch (err) {
    console.error("Onboarding check error:", err);
    return { isComplete: false };
  }
};

export const updateOnboardingStatus = async (userId: string, isComplete: boolean) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: isComplete,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error("Error updating onboarding status:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error("Onboarding update error:", err);
    return { success: false, error: err };
  }
};
