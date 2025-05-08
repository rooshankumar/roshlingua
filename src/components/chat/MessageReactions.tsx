import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

// Common emojis that are frequently used
const commonEmojis = ['👍', '❤️', '😂', '🎉', '🙏', '👏', '🔥', '✅'];

interface MessageReactionsProps {
  messageId: string;
  existingReactions?: Record<string, string[]>;
}

export const MessageReactions = ({ messageId, existingReactions = {} }: MessageReactionsProps) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Record<string, string[]>>(existingReactions);
  const [isLoading, setIsLoading] = useState(false);

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
          data.forEach(reaction => {
            if (!formattedReactions[reaction.reaction]) {
              formattedReactions[reaction.reaction] = [];
            }
            formattedReactions[reaction.reaction].push(reaction.user_id);
          });

          setReactions(formattedReactions);
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
  }, [messageId]);

  const handleReact = async (emoji: string) => {
    if (!user?.id || isLoading) return;

    setIsLoading(true);

    try {
      // **POTENTIAL FIX:**  Replace user.id with the correct user ID from your 'profiles' table.  This assumes a field like 'db_user_id' exists in your user object.  Adapt as necessary to your actual data structure.

      const userId = user.db_user_id || user.id; // Use db_user_id if available, fallback to user.id

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

      // Check if the reaction already exists
      try {
        console.log(`Checking for existing reaction: messageId=${messageId}, userId=${userId}, emoji=${emoji}`);
        const { data: existingReaction, error: checkError } = await supabase
          .from('message_reactions')
          .select('*')
          .eq('message_id', messageId)
          .eq('user_id', userId)
          .eq('reaction', emoji)
          .maybeSingle();
        if (checkError) {
          console.error("Error checking for existing reaction:", checkError);
          // Handle the error appropriately, e.g., revert optimistic update, show error message
          throw checkError;
        }

        if (existingReaction) {
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
        console.error('Error adding/removing reaction:', error);

        // Revert optimistic update if there was an error
        const { data } = await supabase
          .from('message_reactions')
          .select('reaction, user_id')
          .eq('message_id', messageId);

        if (data) {
          const revertedReactions: Record<string, string[]> = {};
          data.forEach(reaction => {
            if (!revertedReactions[reaction.reaction]) {
              revertedReactions[reaction.reaction] = [];
            }
            revertedReactions[reaction.reaction].push(reaction.user_id);
          });

          setReactions(revertedReactions);
        }
        throw error; // Re-throw the error to be handled at a higher level if needed.
      }
    } catch (error) {
      console.error('Error in handleReact:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1" data-message-reactions={messageId}>
      {Object.entries(reactions).map(([emoji, users]) => (
        <Button
          key={emoji}
          variant="outline"
          size="sm"
          className="h-6 px-1.5 py-0 rounded-full bg-muted/30 hover:bg-muted/50 transition-all active:scale-95"
          onClick={() => handleReact(emoji)}
          disabled={isLoading}
        >
          <span className="mr-1 text-sm">{emoji}</span>
          <span className="text-xs font-medium">{users.length}</span>
        </Button>
      ))}
    </div>
  );
};