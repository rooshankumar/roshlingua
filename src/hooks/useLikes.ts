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
      const { data: likes, error } = await supabase
        .from('user_likes')
        .select('liker_id')
        .eq('liked_id', targetUserId);

      if (error) throw error;
      setLikeCount(likes?.length || 0);

      if (currentUserId) {
        setIsLiked(likes?.some(like => like.liker_id === currentUserId) || false);
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

  useEffect(() => {
    fetchLikeStatus();
  }, [targetUserId, currentUserId]);

  const toggleLike = async () => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId || isLoading) return;

    setIsLoading(true);
    const previousLikeCount = likeCount;
    const previousIsLiked = isLiked;

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('user_likes')
          .delete()
          .eq('liker_id', currentUserId)
          .eq('liked_id', targetUserId);

        if (error) throw error;
        setLikeCount(prev => prev - 1);
        setIsLiked(false);
      } else {
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