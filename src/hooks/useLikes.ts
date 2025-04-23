import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function useLikes(targetUserId?: string, currentUserId?: string | null) {
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchLikeStatus = async () => {
    try {
      const { data: likeData, error: countError } = await supabase
        .from('user_likes')
        .select('*', { count: 'exact' })
        .eq('liked_id', targetUserId);

      if (countError) throw countError;
      setLikeCount(likeData?.length || 0);

      if (currentUserId) {
        const { data: userLike, error: likeError } = await supabase
          .from('user_likes')
          .select('*')
          .eq('liker_id', currentUserId)
          .eq('liked_id', targetUserId)
          .maybeSingle();

        if (likeError) throw likeError;
        setIsLiked(!!userLike);
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
    if (!targetUserId) return;
    fetchLikeStatus();
  }, [targetUserId, currentUserId]);

  const toggleLike = async () => {
    if (!currentUserId || currentUserId === targetUserId || isLoading) return;

    setIsLoading(true);
    const previousIsLiked = isLiked;
    const previousLikeCount = likeCount;

    try {
      if (isLiked) {
        const { error: deleteError } = await supabase
          .from('user_likes')
          .delete()
          .eq('liker_id', currentUserId)
          .eq('liked_id', targetUserId);

        if (deleteError) throw deleteError;
        setLikeCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        const { error: insertError } = await supabase
          .from('user_likes')
          .insert([{ 
            liker_id: currentUserId, 
            liked_id: targetUserId,
            created_at: new Date().toISOString()
          }]);

        if (insertError) throw insertError;
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
      }

      // Update profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ likes_count: isLiked ? likeCount - 1 : likeCount + 1 })
        .eq('id', targetUserId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error toggling like:', error);
      setIsLiked(previousIsLiked);
      setLikeCount(previousLikeCount);
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