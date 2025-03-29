
import { supabase } from '@/lib/supabase';

export const checkOnboardingStatus = async (userId: string) => {
  try {
    if (!userId) return { isComplete: false, currentStep: null };
    
    const { data, error } = await supabase
      .from('onboarding_status')
      .select('is_complete, current_step')
      .eq('user_id', userId)
      .single();
    
    console.log("Onboarding status from DB:", data);
    
    if (error) {
      console.error("Error fetching onboarding status:", error);
      return { isComplete: false, currentStep: 'profile' };
    }
    
    return { 
      isComplete: data?.is_complete || false, 
      currentStep: data?.current_step || 'profile'
    };
  } catch (err) {
    console.error("Onboarding check error:", err);
    return { isComplete: false, currentStep: 'profile' };
  }
};

export const updateOnboardingStatus = async (userId: string, isComplete: boolean, currentStep: string) => {
  try {
    const { data, error } = await supabase
      .from('onboarding_status')
      .upsert({
        user_id: userId,
        is_complete: isComplete,
        current_step: currentStep,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error updating onboarding status:", error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (err) {
    console.error("Onboarding update error:", err);
    return { success: false, error: err };
  }
};
import { supabase } from '@/lib/supabase';

export async function checkOnboardingStatus(userId: string) {
  if (!userId) {
    console.error("No user ID provided to check onboarding status");
    return null;
  }

  try {
    // First check if we have a valid session
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      console.error("No active session when checking onboarding status");
      return null;
    }

    // Get onboarding status
    const { data, error } = await supabase
      .from('onboarding_status')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error("Error fetching onboarding status:", error);
      return null;
    }

    console.log("Onboarding status data:", data);
    return data;
  } catch (err) {
    console.error("Exception checking onboarding status:", err);
    return null;
  }
}

export async function completeOnboarding(userId: string) {
  if (!userId) {
    console.error("No user ID provided to complete onboarding");
    return false;
  }

  try {
    const { error } = await supabase
      .from('onboarding_status')
      .update({ 
        is_complete: true, 
        current_step: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error("Failed to complete onboarding:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Exception completing onboarding:", err);
    return false;
  }
}
