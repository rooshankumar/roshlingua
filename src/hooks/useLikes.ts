
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function useLikes(targetUserId?: string, currentUserId?: string | null) {
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!targetUserId) return;

    const fetchLikes = async () => {
      try {
        // Get all likes for target user
        const { data: likes, error } = await supabase
          .from('user_likes')
          .select('*')
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
        console.error('Error fetching likes:', error);
        toast({
          title: "Error",
          description: "Failed to fetch likes",
          variant: "destructive",
        });
      }
    };

    fetchLikes();
  }, [targetUserId, currentUserId]);

  const toggleLike = async () => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId || isLoading) return;

    setIsLoading(true);
    const previousLikeCount = likeCount;
    const previousIsLiked = isLiked;

    try {
      if (isLiked) {
        // Remove like
        const { error } = await supabase
          .from('user_likes')
          .delete()
          .match({ liker_id: currentUserId, liked_id: targetUserId });

        if (error) throw error;
        setLikeCount(prev => prev - 1);
        setIsLiked(false);
      } else {
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
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setLikeCount(previousLikeCount);
      setIsLiked(previousIsLiked);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { likeCount, isLiked, isLoading, toggleLike };
}
