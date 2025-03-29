import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Languages, Circle } from 'lucide-react';
import { Profile } from '@/lib/database.types';
import { User } from '@/types/chat';

interface ChatHeaderProps {
  partner?: User;
}

export const ChatHeader = ({ partner }: ChatHeaderProps) => {
  const { id } = useParams();
  const { user } = useAuth();
  const [otherUser, setOtherUser] = useState<Profile | null>(null);

  useEffect(() => {
    if (!id || !user) { // Removed the partner check to always fetch user info
      return;
    }

    async function getOtherUserInfo() {
      const { data: participants, error } = await supabase
        .from('conversation_participants')
        .select(`
          user_id,
          profiles!conversation_participants_user_id_fkey (
            id,
            username,
            avatar_url,
            is_online,
            nativeLanguage,
            learningLanguage,
            streakCount // Added missing fields
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
  }, [id, user]); // Removed partner from dependency array

  // Using partner information if available, otherwise fallback to otherUser
  const displayedUser = partner || otherUser;

  if (displayedUser) {
    return (
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={displayedUser.avatar_url || displayedUser.avatar || ''} />
            <AvatarFallback>{displayedUser.username?.[0] || displayedUser.name?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{displayedUser.name}</h3>
              <Circle className={`h-3 w-3 ${displayedUser.is_online ? "fill-green-500" : "fill-gray-400"}`} />
              {displayedUser.age && <span className="text-sm text-muted-foreground">{displayedUser.age} years old</span>}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Languages className="h-4 w-4" />
                  <Badge variant="secondary">{displayedUser.nativeLanguage}</Badge>
                  <span>→</span>
                  <Badge>{displayedUser.learningLanguage}</Badge>
                </div>
                <span>•</span>
                <span>Streak: {displayedUser.streakCount} days</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 gap-3">
        {/* Loading indicator or placeholder */}
        <p>Loading...</p>
      </div>
    </div>
  );
};