
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
        .from('profiles')
        .select('likes_count')
        .eq('id', targetUserId)
        .single();

      if (user) {
        setLikeCount(user.likes_count || 0);
      }

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
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', targetUserId)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      if (isLiked) {
        // Unlike
        await supabase
          .from('user_likes')
          .delete()
          .eq('liker_id', currentUserId)
          .eq('liked_id', targetUserId);

        await supabase
          .from('profiles')
          .update({ likes_count: likeCount - 1 })
          .eq('id', targetUserId);

        setLikeCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        // Like
        await supabase
          .from('user_likes')
          .insert([{ liker_id: currentUserId, liked_id: targetUserId }]);

        await supabase
          .from('profiles')
          .update({ likes_count: likeCount + 1 })
          .eq('id', targetUserId);

        setLikeCount(prev => prev + 1);
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
