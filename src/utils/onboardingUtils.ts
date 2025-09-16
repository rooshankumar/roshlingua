
import { supabase } from '@/lib/supabase';

export const checkOnboardingStatus = async (userId: string) => {
  try {
    if (!userId) return { isComplete: false };

    console.log("Checking onboarding status for user:", userId);
    
    // Check onboarding_status row
    const { data, error } = await supabase
      .from('onboarding_status')
      .select('is_complete')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error("Error fetching onboarding status:", error);
      // If we got a 404/not found error, the row might not exist yet
      if (error.code === 'PGRST116') {
        console.log("Onboarding row not found, creating a new onboarding_status entry");
        
        try {
          // Create a placeholder onboarding_status row to ensure flow works
          const { error: createError } = await supabase
            .from('onboarding_status')
            .insert({
              user_id: userId,
              is_complete: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (createError) {
            console.error("Error creating onboarding_status:", createError);
            return { isComplete: false, error: createError };
          }
          
          // Verify row was created
          const { data: newRow, error: verifyError } = await supabase
            .from('onboarding_status')
            .select('is_complete')
            .eq('user_id', userId)
            .single();
            
          if (verifyError) {
            console.error("Error verifying new onboarding_status:", verifyError);
            return { isComplete: false, error: verifyError };
          }
          
          return { isComplete: newRow?.is_complete || false };
        } catch (err) {
          console.error("Error in onboarding_status creation process:", err);
          return { isComplete: false, error: err };
        }
      }
      
      return { isComplete: false, error };
    }

    console.log("Onboarding status retrieved:", data?.is_complete);
    return { 
      isComplete: data?.is_complete || false
    };
  } catch (err) {
    console.error("Onboarding check error:", err);
    return { isComplete: false };
  }
};

export const updateOnboardingStatus = async (userId: string, isComplete: boolean) => {
  try {
    const { error } = await supabase
      .from('onboarding_status')
      .upsert({
        user_id: userId,
        is_complete: isComplete,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

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
