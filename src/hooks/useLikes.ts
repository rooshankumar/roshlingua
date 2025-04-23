
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export function useLikes(targetUserId: string, currentUserId: string | undefined) {
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!targetUserId) return;

    fetchLikeStatus();
    setupRealtimeSubscription();

    return () => {
      supabase.removeChannel('likes');
    };
  }, [targetUserId, currentUserId]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('likes')
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
      channel.unsubscribe();
    };
  };

  const fetchLikeStatus = async () => {
    try {
      const { data: likes, error: countError } = await supabase
        .from('user_likes')
        .select('*')
        .eq('liked_id', targetUserId);

      if (countError) throw countError;
      setLikeCount(likes?.length || 0);

      if (currentUserId) {
        setIsLiked(likes?.some(like => like.liker_id === currentUserId) || false);
      } else {
        setIsLiked(false);
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

  const toggleLike = async () => {
    if (!currentUserId || currentUserId === targetUserId || isLoading) return;

    setIsLoading(true);

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
        
        toast({
          title: "Success",
          description: "Like removed successfully",
        });
      } else {
        const { error: insertError } = await supabase
          .from('user_likes')
          .insert([{ 
            liker_id: currentUserId, 
            liked_id: targetUserId,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (insertError) {
          if (insertError.code === '23505') {
            toast({
              title: "Info",
              description: "You've already liked this profile",
            });
            return;
          }
          throw insertError;
        }

        setLikeCount(prev => prev + 1);
        setIsLiked(true);

        toast({
          title: "Success",
          description: "Profile liked successfully",
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
      await fetchLikeStatus();
    } finally {
      setIsLoading(false);
    }
  };

  return { likeCount, isLiked, isLoading, toggleLike };
}
