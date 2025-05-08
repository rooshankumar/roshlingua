
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// Common emojis that are frequently used
const commonEmojis = ['👍', '❤️', '😂', '🎉', '🙏', '👏', '🔥', '✅'];

interface MessageReactionsProps {
  messageId: string;
  existingReactions?: Record<string, string[]>;
  onClose?: () => void;
  isReactionPicker?: boolean;
}

export const MessageReactions = ({ 
  messageId, 
  existingReactions = {}, 
  onClose,
  isReactionPicker = false
}: MessageReactionsProps) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Record<string, string[]>>(existingReactions);
  const [isLoading, setIsLoading] = useState(false);
  const [userReactions, setUserReactions] = useState<string[]>([]);

  // Emoji set for the reaction picker - more limited for Instagram-like feel
  const reactionEmojis = isReactionPicker 
    ? ['❤️', '😂', '😢', '👍', '👎', '😡'] 
    : commonEmojis;

  // Fetch existing reactions when component mounts
  useEffect(() => {
    const fetchReactions = async () => {
      if (!messageId) return;

      try {
        const { data, error } = await supabase
          .from('message_reactions')
          .select('reaction, user_id')
          .eq('message_id', messageId);

        if (error) throw error;

        if (data && data.length > 0) {
          // Transform the data into our format
          const formattedReactions: Record<string, string[]> = {};
          const currentUserReactions: string[] = [];
          const userId = user?.db_user_id || user?.id;

          data.forEach(reaction => {
            if (!formattedReactions[reaction.reaction]) {
              formattedReactions[reaction.reaction] = [];
            }
            formattedReactions[reaction.reaction].push(reaction.user_id);
            
            // Track which reactions the current user has already added
            if (reaction.user_id === userId) {
              currentUserReactions.push(reaction.reaction);
            }
          });

          setReactions(formattedReactions);
          setUserReactions(currentUserReactions);
        }
      } catch (error) {
        console.error('Error fetching message reactions:', error);
      }
    };

    fetchReactions();

    // Set up real-time subscription for reaction updates
    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on('postgres_changes', 
        {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`
        },
        () => {
          // Refetch reactions when changes occur
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, user?.id, user?.db_user_id]);

  const handleReact = async (emoji: string) => {
    if (!user?.id || isLoading) return;

    setIsLoading(true);

    try {
      const userId = user.db_user_id || user.id; // Use db_user_id if available, fallback to user.id

      // Check if user has already reacted with this emoji
      const hasReacted = userReactions.includes(emoji);

      // Update local state optimistically for immediate feedback
      setReactions(prev => {
        const updatedReactions = { ...prev };

        if (!updatedReactions[emoji]) {
          updatedReactions[emoji] = [userId];
        } else if (!updatedReactions[emoji].includes(userId)) {
          updatedReactions[emoji] = [...updatedReactions[emoji], userId];
        } else {
          updatedReactions[emoji] = updatedReactions[emoji].filter(id => id !== userId);
          if (updatedReactions[emoji].length === 0) {
            delete updatedReactions[emoji];
          }
        }

        return updatedReactions;
      });

      // Update user reactions tracking
      setUserReactions(prev => {
        if (hasReacted) {
          return prev.filter(e => e !== emoji);
        } else {
          return [...prev, emoji];
        }
      });

      // If this is a picker, close it after selection
      if (isReactionPicker && onClose) {
        setTimeout(() => onClose(), 200);
      }

      try {
        if (hasReacted) {
          // Delete the reaction if it exists
          await supabase
            .from('message_reactions')
            .delete()
            .eq('message_id', messageId)
            .eq('user_id', userId)
            .eq('reaction', emoji);
        } else {
          // Insert a new reaction
          await supabase
            .from('message_reactions')
            .insert({
              message_id: messageId,
              user_id: userId,
              reaction: emoji,
              created_at: new Date().toISOString()
            });
        }
      } catch (error) {
        console.error('Error managing reaction:', error);

        // Revert optimistic update if there was an error
        const { data } = await supabase
          .from('message_reactions')
          .select('reaction, user_id')
          .eq('message_id', messageId);

        if (data) {
          const revertedReactions: Record<string, string[]> = {};
          const revertedUserReactions: string[] = [];
          
          data.forEach(reaction => {
            if (!revertedReactions[reaction.reaction]) {
              revertedReactions[reaction.reaction] = [];
            }
            revertedReactions[reaction.reaction].push(reaction.user_id);
            
            if (reaction.user_id === userId) {
              revertedUserReactions.push(reaction.reaction);
            }
          });

          setReactions(revertedReactions);
          setUserReactions(revertedUserReactions);
        }
      }
    } catch (error) {
      console.error('Error in handleReact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // If there are no reactions and this is not a picker, don't render anything
  if (Object.keys(reactions).length === 0 && !isReactionPicker) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 ${isReactionPicker ? 'p-2 bg-background/95 backdrop-blur-md rounded-full shadow-lg' : 'mt-1'}`}>
      {isReactionPicker ? (
        // Reaction picker mode
        reactionEmojis.map((emoji) => (
          <Button
            key={emoji}
            variant="ghost" 
            size="sm"
            className={`h-8 w-8 p-0 rounded-full hover:bg-muted/50 transition-all ${userReactions.includes(emoji) ? 'bg-muted/40 ring-1 ring-primary' : ''}`}
            onClick={() => handleReact(emoji)}
            disabled={isLoading}
          >
            <span className="text-base">{emoji}</span>
          </Button>
        ))
      ) : (
        // Display existing reactions
        Object.entries(reactions).map(([emoji, users]) => (
          <Button
            key={emoji}
            variant="outline"
            size="sm"
            className={`h-6 px-1.5 py-0 rounded-full bg-muted/30 hover:bg-muted/50 transition-all active:scale-95 ${userReactions.includes(emoji) ? 'ring-1 ring-primary' : ''}`}
            onClick={() => handleReact(emoji)}
            disabled={isLoading}
          >
            <span className="mr-1 text-xs">{emoji}</span>
            <span className="text-xs font-medium">{users.length}</span>
          </Button>
        ))
      )}
    </div>
  );
};

// Export a standalone picker component for convenience
export const ReactionPicker = ({ messageId, onClose }: { messageId: string, onClose?: () => void }) => {
  return (
    <MessageReactions
      messageId={messageId}
      isReactionPicker={true}
      onClose={onClose}
    />
  );
};
