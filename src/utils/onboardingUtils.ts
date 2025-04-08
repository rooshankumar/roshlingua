
import { supabase } from '@/lib/supabase';

export const checkOnboardingStatus = async (userId: string) => {
  try {
    if (!userId) return { isComplete: false };

    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Error fetching onboarding status:", error);
      return { isComplete: false };
    }

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
