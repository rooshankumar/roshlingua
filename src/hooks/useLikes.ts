
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function useLikes(targetUserId: string, currentUserId: string) {
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (targetUserId) {
      fetchLikeStatus();
    }
  }, [targetUserId, currentUserId]);

  const fetchLikeStatus = async () => {
    try {
      // Get like count first
      const { data: likes, error: likesError } = await supabase
        .from('user_likes')
        .select('*', { count: 'exact' })
        .eq('liked_id', targetUserId);

      if (likesError) throw likesError;

      const actualLikeCount = likes?.length || 0;
      setLikeCount(actualLikeCount);

      // Only check user's like status if they're logged in
      if (currentUserId && currentUserId !== targetUserId) {
        const { data: userLike, error: userLikeError } = await supabase
          .from('user_likes')
          .select('*')
          .eq('liker_id', currentUserId)
          .eq('liked_id', targetUserId)
          .maybeSingle();

        if (userLikeError) throw userLikeError;
        
        // Explicitly set isLiked based on whether userLike exists
        setIsLiked(!!userLike);
      } else {
        // Reset like status if no current user or if viewing own profile
        setIsLiked(false);
      }
    } catch (error) {
      console.error('Error fetching like status:', error);
      toast({
        title: "Error",
        description: "Failed to fetch like status",
        variant: "destructive",
      });
      setIsLiked(false);
    }
  };

  const toggleLike = async () => {
    if (isLoading || !currentUserId || currentUserId === targetUserId) {
      return;
    }

    setIsLoading(true);

    try {
      if (isLiked) {
        // Remove like if already liked
        const { error: deleteError } = await supabase
          .from('user_likes')
          .delete()
          .eq('liker_id', currentUserId)
          .eq('liked_id', targetUserId);

        if (deleteError) throw deleteError;

        setLikeCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
        
        toast({
          title: "Success",
          description: "Like removed successfully",
        });
      } else {
        // Start a transaction by adding the like and updating the profile count
        const { data: newLike, error: insertError } = await supabase
          .from('user_likes')
          .insert([{ 
            liker_id: currentUserId, 
            liked_id: targetUserId,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        // Update the profile's like count
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            likes_count: likeCount + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', targetUserId);

        if (updateError) throw updateError;

        setLikeCount(prev => prev + 1);
        setIsLiked(true);

        toast({
          title: "Success",
          description: "Profile liked successfully",
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
      // Reset state in case of error
      await fetchLikeStatus();
    } finally {
      setIsLoading(false);
    }
  };

  return { likeCount, isLiked, isLoading, toggleLike };
}
