
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
      // Get like count
      const { data: user } = await supabase
        .from('users')
        .select('likes_count')
        .eq('id', targetUserId)
        .single();

      if (user) {
        setLikeCount(user.likes_count);
      }

      // Check if current user has liked
      const { data: like } = await supabase
        .from('user_likes')
        .select('*')
        .eq('liker_id', currentUserId)
        .eq('liked_id', targetUserId)
        .single();

      setIsLiked(!!like);
    } catch (error) {
      console.error('Error fetching like status:', error);
    }
  };

  const subscribeToLikes = () => {
    const channel = supabase
      .channel(`user-likes:${targetUserId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${targetUserId}`,
      }, (payload) => {
        if (payload.new) {
          setLikeCount(payload.new.likes_count);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleLike = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('user_likes')
          .delete()
          .eq('liker_id', currentUserId)
          .eq('liked_id', targetUserId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_likes')
          .insert([{ liker_id: currentUserId, liked_id: targetUserId }]);

        if (error) throw error;
      }

      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);

    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: 'Error',
        description: 'Failed to update like status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { likeCount, isLiked, isLoading, toggleLike };
}
