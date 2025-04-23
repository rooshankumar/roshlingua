
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function useLikes(targetUserId?: string, currentUserId?: string | null) {
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchLikeStatus = async () => {
    if (!targetUserId) return;

    try {
      // Get all likes for target user
      const { data: likes, error } = await supabase
        .from('user_likes')
        .select('liker_id')
        .eq('liked_id', targetUserId);

      if (error) throw error;

      // Update like count
      setLikeCount(likes?.length || 0);

      // Check if current user has liked
      if (currentUserId) {
        const hasLiked = likes?.some(like => like.liker_id === currentUserId);
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

  useEffect(() => {
    fetchLikeStatus();
  }, [targetUserId, currentUserId]);

  const toggleLike = async () => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId || isLoading) return;

    setIsLoading(true);
    const newIsLiked = !isLiked;

    try {
      if (newIsLiked) {
        // Add like
        const { error } = await supabase
          .from('user_likes')
          .insert({
            liker_id: currentUserId,
            liked_id: targetUserId,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
      } else {
        // Remove like
        const { error } = await supabase
          .from('user_likes')
          .delete()
          .eq('liker_id', currentUserId)
          .eq('liked_id', targetUserId);

        if (error) throw error;
        setLikeCount(prev => prev - 1);
        setIsLiked(false);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
      // Revert states on error
      setIsLiked(!newIsLiked);
      setLikeCount(prev => newIsLiked ? prev - 1 : prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return { likeCount, isLiked, isLoading, toggleLike };
}
