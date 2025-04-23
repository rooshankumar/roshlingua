
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function useLikes(targetUserId: string, currentUserId: string | undefined) {
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchLikeStatus = async () => {
    try {
      // Get all likes for the target profile
      const { data: likes, error: likesError } = await supabase
        .from('user_likes')
        .select('*')
        .eq('liked_id', targetUserId);

      if (likesError) throw likesError;

      // Set total like count
      setLikeCount(likes?.length || 0);

      // Check if current user has liked the profile
      if (currentUserId) {
        const hasLiked = likes?.some(like => like.liker_id === currentUserId) || false;
        setIsLiked(hasLiked);
      }
    } catch (error) {
      console.error('Error fetching like status:', error);
      toast({
        title: "Error",
        description: "Failed to fetch like status",
        variant: "destructive",
      });
    }
  };

  const toggleLike = async () => {
    if (!currentUserId || currentUserId === targetUserId || isLoading) return;

    setIsLoading(true);

    try {
      if (isLiked) {
        // Remove like
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
        // Add like
        const { error: insertError } = await supabase
          .from('user_likes')
          .insert([{ 
            liker_id: currentUserId, 
            liked_id: targetUserId,
            created_at: new Date().toISOString()
          }]);

        if (insertError) {
          if (insertError.code === '23505') {
            toast({
              title: "Info",
              description: "You've already liked this profile",
            });
            return;
          }
          throw insertError;
        }

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
      // Refresh like status on error
      await fetchLikeStatus();
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch initial like status
  useEffect(() => {
    if (!targetUserId) return;
    fetchLikeStatus();
  }, [targetUserId, currentUserId]);

  return { likeCount, isLiked, isLoading, toggleLike };
}
