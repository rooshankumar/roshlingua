
// src/hooks/useProfiles.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/schema';

export const useProfile = (userId: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        // Try to create a default profile
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', userId)
            .maybeSingle();
            
          if (userData?.full_name) {
            const username = userData.full_name.toLowerCase().replace(/\s+/g, '_');
            
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                username: username,
                bio: `I'm learning a new language.`,
                is_online: true
              })
              .select()
              .single();
              
            if (createError) throw createError;
            return newProfile;
          }
        } catch (createError) {
          console.error("Failed to create default profile:", createError);
          throw new Error('Profile not found and could not be created');
        }
      }
      
      return data;
    },
    retry: 1,
    enabled: !!userId
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      updates 
    }: { 
      userId: string; 
      updates: { username?: string; bio?: string; avatar_url?: string; }
    }) => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['profile', data.id] });
    },
  });
};

export const useUserWithProfile = (userId: string) => {
  return useQuery({
    queryKey: ['user-with-profile', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      const [userResponse, profileResponse] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
      ]);
      
      if (userResponse.error) throw userResponse.error;
      
      // If profile doesn't exist but user does, create a default profile
      if (profileResponse.error && profileResponse.error.code === 'PGRST116' && userResponse.data) {
        const username = userResponse.data.full_name?.toLowerCase().replace(/\s+/g, '_') || `user_${userId.substring(0, 8)}`;
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            username: username,
            bio: `I'm learning a new language.`,
            is_online: true
          })
          .select()
          .single();
          
        if (createError) throw createError;
        
        return {
          ...userResponse.data,
          profile: newProfile
        };
      }
      
      if (profileResponse.error) throw profileResponse.error;
      
      return {
        ...userResponse.data,
        profile: profileResponse.data
      };
    },
    retry: 1,
    enabled: !!userId
  });
};
