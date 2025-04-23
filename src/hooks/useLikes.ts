
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function useLikes(targetUserId: string, currentUserId: string) {
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (targetUserId && currentUserId) {
      fetchLikeStatus();
    }
  }, [targetUserId, currentUserId]);

  const fetchLikeStatus = async () => {
    try {
      // Get like count
      const { data: likes, error: likesError } = await supabase
        .from('user_likes')
        .select('*', { count: 'exact' })
        .eq('liked_id', targetUserId);

      if (likesError) throw likesError;

      const actualLikeCount = likes?.length || 0;
      setLikeCount(actualLikeCount);

      // Check if current user has already liked
      if (currentUserId) {
        const { data: userLike, error: userLikeError } = await supabase
          .from('user_likes')
          .select('*')
          .eq('liker_id', currentUserId)
          .eq('liked_id', targetUserId)
          .maybeSingle();

        if (userLikeError) throw userLikeError;
        setIsLiked(!!userLike);
      }
    } catch (error) {
      console.error('Error fetching like status:', error);
      setIsLiked(false);
    }
  };

  const toggleLike = async () => {
    if (isLoading || !currentUserId) return;

    setIsLoading(true);

    try {
      // Check for existing like
      const { data: existingLike, error: checkError } = await supabase
        .from('user_likes')
        .select('*')
        .eq('liker_id', currentUserId)
        .eq('liked_id', targetUserId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingLike) {
        toast({
          title: "Already liked",
          description: "You can only like a profile once",
        });
        return;
      }

      // Insert new like
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

      toast({
        title: "Success",
        description: "Profile liked successfully",
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to like profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { likeCount, isLiked, isLoading, toggleLike };
}
