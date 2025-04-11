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
      // Get actual like count
      const { data: likes, error: likesError } = await supabase
        .from('user_likes')
        .select('*', { count: 'exact' })
        .eq('liked_id', targetUserId);

      if (likesError) throw likesError;

      const actualLikeCount = likes?.length || 0;

      // Sync likes count with profiles table
      await supabase
        .from('profiles')
        .update({ likes_count: actualLikeCount })
        .eq('id', targetUserId);

      setLikeCount(actualLikeCount);

      // Check if current user has already liked
      if (currentUserId) {
        const { data: existingLike } = await supabase
          .from('user_likes')
          .select()
          .eq('liker_id', currentUserId)
          .eq('liked_id', targetUserId)
          .maybeSingle();

        setIsLiked(!!existingLike);
      }
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
        table: 'user_likes',
        filter: `liked_id=eq.${targetUserId}`,
      }, () => {
        fetchLikeStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleLike = async () => {
    if (isLoading || !currentUserId) return;

    // Check if current user has already liked this profile
    const { data: existingLike } = await supabase
      .from('user_likes')
      .select()
      .eq('liker_id', currentUserId)
      .eq('liked_id', targetUserId)
      .maybeSingle();

    if (existingLike) {
      toast({
        title: "Already liked",
        description: "You can only like a profile once",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('user_likes')
        .insert([{ 
          liker_id: currentUserId, 
          liked_id: targetUserId,
          created_at: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      // Get updated count
      const { data: likes } = await supabase
        .from('user_likes')
        .select('*', { count: 'exact' })
        .eq('liked_id', targetUserId);

      const newCount = (likes?.length || 0);

      // Update profile with new count
      await supabase
        .from('profiles')
        .update({ likes_count: newCount })
        .eq('id', targetUserId);

      setLikeCount(newCount);
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