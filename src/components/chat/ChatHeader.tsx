
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/providers/AuthProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Profile } from '@/lib/database.types';

export default function ChatHeader() {
  const { id } = useParams();
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [otherUser, setOtherUser] = useState<Profile | null>(null);

  useEffect(() => {
    async function getOtherUserInfo() {
      if (!id || !user) return;

      const { data: participants, error } = await supabase
        .from('conversation_participants')
        .select(`
          user_id,
          profiles!conversation_participants_user_id_fkey (
            id,
            username,
            avatar_url,
            is_online
          )
        `)
        .eq('conversation_id', id);

      if (error) {
        console.error('Error fetching participants:', error);
        return;
      }

      if (participants && participants.length > 0) {
        const otherParticipant = participants.find(p => p.user_id !== user.id);
        if (otherParticipant?.profiles) {
          setOtherUser(otherParticipant.profiles);
        }
      }
    }

    getOtherUserInfo();
  }, [id, supabase, user]);

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 gap-3">
        {otherUser && (
          <>
            <Avatar>
              <AvatarImage src={otherUser.avatar_url || ''} />
              <AvatarFallback>{otherUser.username?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium leading-none">{otherUser.username}</p>
              <p className="text-sm text-muted-foreground">
                {otherUser.is_online ? 'Online' : 'Offline'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
import { User } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Languages, Circle } from "lucide-react";

interface ChatHeaderProps {
  partner: User;
}

export const ChatHeader = ({ partner }: ChatHeaderProps) => {
  return (
    <div className="border-b p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={partner.avatar} />
          <AvatarFallback>{partner.name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{partner.name}</h3>
            <Circle className={`h-3 w-3 ${partner.isOnline ? "fill-green-500" : "fill-gray-400"}`} />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Languages className="h-4 w-4" />
              <Badge variant="secondary">{partner.nativeLanguage}</Badge>
              <span>→</span>
              <Badge>{partner.learningLanguage}</Badge>
            </div>
            <span>•</span>
            <span>Streak: {partner.streakCount} days</span>
          </div>
        </div>
      </div>
    </div>
  );
};
