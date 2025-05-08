
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// Messenger-style emoji set
const messengerEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];

interface MessageReactionsProps {
  messageId: string;
  existingReactions?: Record<string, string[]>;
  onClose?: () => void;
  isReactionPicker?: boolean;
  position?: 'top' | 'bottom';
}

export const MessageReactions = ({ 
  messageId, 
  existingReactions = {}, 
  onClose,
  isReactionPicker = false,
  position = 'top'
}: MessageReactionsProps) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Record<string, string[]>>(existingReactions);
  const [isLoading, setIsLoading] = useState(false);
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

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

  if (isReactionPicker) {
    return (
      <div 
        ref={containerRef}
        className="messenger-reaction-picker flex items-center px-2 py-1 rounded-full bg-background/95 shadow-lg border border-border/50 backdrop-blur-md animate-scale-in"
        style={{
          position: 'absolute',
          [position === 'top' ? 'bottom' : 'top']: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50
        }}
      >
        {messengerEmojis.map((emoji) => (
          <Button
            key={emoji}
            variant="ghost" 
            size="sm"
            className="h-9 w-9 p-0 rounded-full hover:bg-muted transition-all active:scale-110"
            onClick={() => handleReact(emoji)}
            disabled={isLoading}
          >
            <span className="text-xl">{emoji}</span>
          </Button>
        ))}
      </div>
    );
  }

  // If there are no reactions, don't render anything
  if (Object.keys(reactions).length === 0) {
    return null;
  }

  // Display existing reactions
  return (
    <div className="messenger-reactions-display">
      <div className="flex -space-x-1 items-center shadow-sm">
        {Object.entries(reactions).map(([emoji, users]) => (
          <div
            key={emoji}
            className={`messenger-reaction flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-xs 
              ${userReactions.includes(emoji) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'} 
              cursor-pointer active:scale-95 transition-all`}
            onClick={() => handleReact(emoji)}
          >
            <span className="mr-[1px]">{emoji}</span>
            {users.length > 1 && <span className="text-[10px] font-medium">{users.length}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ReactionPicker = ({ messageId, onClose, position = 'top' }: { messageId: string, onClose?: () => void, position?: 'top' | 'bottom' }) => {
  return (
    <MessageReactions
      messageId={messageId}
      isReactionPicker={true}
      onClose={onClose}
      position={position}
    />
  );
};
