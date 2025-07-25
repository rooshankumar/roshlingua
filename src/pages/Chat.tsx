import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChatScreen } from '@/components/chat/ChatScreen';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const { receiverId, conversationId } = useParams<{ receiverId?: string; conversationId?: string }>();
  const [actualReceiverId, setActualReceiverId] = useState<string | undefined>(receiverId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If we have a conversationId, we need to find the other participant
    if (conversationId && user && !receiverId) {
      setLoading(true);

      const fetchOtherParticipant = async () => {
        try {
          const { data: participants, error } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .neq('user_id', user.id);

          if (error) throw error;

          if (participants && participants.length > 0) {
            setActualReceiverId(participants[0].user_id);
          }
        } catch (error) {
          console.error('Error fetching conversation participants:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchOtherParticipant();
    } else if (receiverId) {
      setActualReceiverId(receiverId);
    }
  }, [conversationId, receiverId, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!actualReceiverId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please select a conversation</p>
      </div>
    );
  }

  return <ChatScreen receiverId={actualReceiverId} conversationId={conversationId} />;
};

export default Chat;