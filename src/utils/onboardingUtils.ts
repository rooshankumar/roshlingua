import { supabase } from '@/lib/supabase';

export const checkOnboardingStatus = async (userId: string) => {
  try {
    if (!userId) return { isComplete: false, currentStep: null };

    const { data, error } = await supabase
      .from('onboarding_status')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error("Error fetching onboarding status:", error);
      return { isComplete: false, currentStep: 'profile' };
    }

    return { 
      isComplete: data?.is_complete || false, 
      currentStep: data?.current_step || 'profile',
      profile: data
    };
  } catch (err) {
    console.error("Onboarding check error:", err);
    return { isComplete: false, currentStep: 'profile' };
  }
};

export const updateOnboardingStatus = async (userId: string, data: any) => {
  try {
    const { error } = await supabase
      .from('onboarding_status')
      .upsert({
        user_id: userId,
        ...data,
        updated_at: new Date().toISOString()
      });

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