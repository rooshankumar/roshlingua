
// src/hooks/useProfiles.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useProfile = (userId: string) => {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(); // Changed from single() to maybeSingle() to handle missing profiles

        if (error) {
          console.error("Error fetching profile:", error);
          toast({
            variant: "destructive",
            title: "Error loading profile",
            description: "Could not load profile data. Please try again.",
          });
          throw error;
        }
        
        return data || { id: userId }; // Return at least an object with ID if no profile exists
      } catch (error) {
        console.error("Unexpected error in useProfile:", error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      updates 
    }: { 
      userId: string; 
      updates: { username?: string; bio?: string; avatar_url?: string; }
    }) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select()
          .maybeSingle(); // Changed from single() to maybeSingle()

        if (error) {
          console.error("Error updating profile:", error);
          toast({
            variant: "destructive",
            title: "Update failed",
            description: error.message || "Could not update profile. Please try again.",
          });
          throw error;
        }
        
        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated.",
        });
        
        return data;
      } catch (error) {
        console.error("Unexpected error in useUpdateProfile:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
      }
    },
  });
};

// Add a function to handle streak updates
export const useUpdateStreak = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId: string) => {
      try {
        // Get the current date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // First check if the user exists in profiles table
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
          
        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "not found" error
          console.error("Error checking profile existence:", profileError);
          throw profileError;
        }
        
        // If profile doesn't exist, create one with initial streak
        if (!existingProfile) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('id', userId)
            .maybeSingle();
            
          if (userError) {
            console.error("Error fetching user data:", userError);
            throw userError;
          }
          
          // Create profile record
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              username: userData?.full_name?.toLowerCase().replace(/\s+/g, '_') || `user_${userId.slice(0, 8)}`,
              is_online: true,
              streak_count: 1
            });
            
          if (insertError) {
            console.error("Error creating profile:", insertError);
            throw insertError;
          }
          
          return { streak_count: 1, streak_updated: true };
        }
        
        // For existing profiles, update the streak based on last active date
        const { data: userData, error: userDataError } = await supabase
          .from('users')
          .select('streak_count, streak_last_date')
          .eq('id', userId)
          .maybeSingle();
          
        if (userDataError) {
          console.error("Error fetching user streak data:", userDataError);
          throw userDataError;
        }
        
        let newStreakCount = 1; // Default to 1 if no previous streak or too much time passed
        let streakUpdated = false;
        
        // If we have streak data, check if we should increment or reset
        if (userData?.streak_last_date) {
          const lastDate = new Date(userData.streak_last_date);
          const daysSinceLastStreak = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
          
          if (daysSinceLastStreak === 0) {
            // Already updated streak today, no change needed
            newStreakCount = userData.streak_count || 1;
            streakUpdated = false;
          } else if (daysSinceLastStreak === 1) {
            // Consecutive day, increment streak
            newStreakCount = (userData.streak_count || 0) + 1;
            streakUpdated = true;
          } else {
            // More than a day passed, reset streak
            newStreakCount = 1;
            streakUpdated = true;
          }
        } else {
          // No previous streak data, set to 1
          streakUpdated = true;
        }
        
        if (streakUpdated) {
          // Update streak in users table
          const { error: updateError } = await supabase
            .from('users')
            .update({
              streak_count: newStreakCount,
              streak_last_date: today
            })
            .eq('id', userId);
            
          if (updateError) {
            console.error("Error updating streak:", updateError);
            throw updateError;
          }
          
          if (streakUpdated) {
            toast({
              title: "Streak updated!",
              description: `You're on a ${newStreakCount} day streak! Keep it up!`,
            });
          }
        }
        
        return { streak_count: newStreakCount, streak_updated: streakUpdated };
      } catch (error) {
        console.error("Error in updateStreak:", error);
        throw error;
      }
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });
};
