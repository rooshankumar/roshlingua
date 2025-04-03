
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function useLikes(targetUserId: string, currentUserId: string) {
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchLikeStatus();
    subscribeToLikes();
  }, [targetUserId, currentUserId]);

  const fetchLikeStatus = async () => {
    try {
      // Get actual like count from user_likes table
      const { data: likes, error: likesError } = await supabase
        .from('user_likes')
        .select('*', { count: 'exact' })
        .eq('liked_id', targetUserId);

      if (likesError) throw likesError;
      
      const actualLikeCount = likes?.length || 0;

      // Update profiles table with accurate count if needed
      await supabase
        .from('profiles')
        .update({ likes_count: actualLikeCount })
        .eq('id', targetUserId);

      setLikeCount(actualLikeCount);

      // Check if current user has liked
      const { data: like } = await supabase
        .from('user_likes')
        .select()
        .eq('liker_id', currentUserId)
        .eq('liked_id', targetUserId)
        .maybeSingle();

      setIsLiked(!!like);
    } catch (error) {
      console.error('Error fetching like status:', error);
    }
  };

  const subscribeToLikes = () => {
    const channel = supabase
      .channel(`profile-likes:${targetUserId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${targetUserId}`,
      }, (payload) => {
        if (payload.new) {
          setLikeCount(payload.new.likes_count || 0);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleLike = async () => {
    if (isLoading || !currentUserId) return;
    setIsLoading(true);

    try {
      // Start a transaction-like operation
      if (isLiked) {
        // Unlike - First remove the like
        const { error: deleteError } = await supabase
          .from('user_likes')
          .delete()
          .eq('liker_id', currentUserId)
          .eq('liked_id', targetUserId);

        if (deleteError) throw deleteError;

        // Get current like count
        const { data: likes } = await supabase
          .from('user_likes')
          .select('*', { count: 'exact' })
          .eq('liked_id', targetUserId);

        const newCount = (likes?.length || 0);

        // Update profile with accurate count
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ likes_count: newCount })
          .eq('id', targetUserId);

        if (updateError) throw updateError;

        setLikeCount(newCount);
        setIsLiked(false);
      } else {
        // Like - First add the like
        const { error: insertError } = await supabase
          .from('user_likes')
          .insert([{ liker_id: currentUserId, liked_id: targetUserId }]);

        if (insertError) throw insertError;

        // Get current like count
        const { data: likes } = await supabase
          .from('user_likes')
          .select('*', { count: 'exact' })
          .eq('liked_id', targetUserId);

        const newCount = (likes?.length || 0);

        // Update profile with accurate count
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ likes_count: newCount })
          .eq('id', targetUserId);

        if (updateError) throw updateError;

        setLikeCount(newCount);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: 'Error',
        description: 'Failed to update like status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { likeCount, isLiked, isLoading, toggleLike };
}
