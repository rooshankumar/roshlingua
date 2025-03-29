
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useTypingStatus(conversationId: string) {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel(`typing:${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const typing = new Set(
          Object.values(newState)
            .flat()
            .filter((presence: any) => presence.isTyping)
            .map((presence: any) => presence.userId)
        );
        setTypingUsers(typing);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const setTyping = async (isTyping: boolean) => {
    const channel = supabase.channel(`typing:${conversationId}`);
    await channel.track({ isTyping });
  };

  return { typingUsers, setTyping };
}
