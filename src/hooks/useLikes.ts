
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
    
    const fetchLikeStatus = async () => {
      try {
        // Get total likes count
        const { data: likeData, error: countError } = await supabase
          .from('user_likes')
          .select('*', { count: 'exact' })
          .eq('liked_id', targetUserId);

        if (countError) throw countError;
        setLikeCount(likeData?.length || 0);

        // Check if current user has liked
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
