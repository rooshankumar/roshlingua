import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSupabase } from '@/hooks/useSupabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Profile } from '@/lib/database.types';

export default function ChatHeader() {
  const { id } = useParams();
  const { supabase } = useSupabase();
  const [recipient, setRecipient] = useState<Profile | null>(null);

  useEffect(() => {
    async function getRecipientInfo() {
      if (!id) return;

      const { data: participant } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', id)
        .neq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (participant) {
        const { data: profile } = await supabase
          .from('profiles')
          .select()
          .eq('id', participant.user_id)
          .single();

        if (profile) setRecipient(profile);
      }
    }

    getRecipientInfo();
  }, [id, supabase]);

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 gap-3">
        {recipient && (
          <>
            <Avatar>
              <AvatarImage src={recipient.avatar_url || ''} />
              <AvatarFallback>{recipient.full_name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium leading-none">{recipient.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {recipient.is_online ? 'Online' : 'Offline'}
              </p>
            </div>
          </>
        )}
        <div className="ml-auto flex items-center space-x-4">
          {/* Chat controls can go here */}
        </div>
      </div>
    </div>
  );
}