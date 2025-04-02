import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserStatus } from '@/components/UserStatus';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/supabase';

interface Props {
  conversation: {
    id: string;
    participant: {
      id: string;
      email: string;
      full_name: string;
      avatar_url: string;
      is_online?: boolean;
      last_seen?: string;
    };
  };
}

export const ChatHeader = ({ conversation }: Props) => {
  const navigate = useNavigate();
  const participant = conversation?.participant;

  const handleReport = () => {
    // TODO: Implement report functionality
    console.log('Report user:', participant?.id);
  };

  const handleBlock = () => {
    // TODO: Implement block functionality
    console.log('Block user:', participant?.id);
  };

  if (!participant) {
    return <div className="flex items-center p-4">Loading...</div>;
  }

  return (
    <div className="chat-header sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-4xl mx-auto">
        <div className="flex items-center justify-between p-2 md:p-4">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="relative">
              <Avatar className="h-8 w-8 md:h-10 md:w-10">
                <AvatarImage src={participant?.avatar_url || '/placeholder.svg'} />
                <AvatarFallback>{participant?.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className={`absolute bottom-0 right-0 w-2 h-2 md:w-3 md:h-3 rounded-full ring-2 ring-background ${participant?.is_online ? "bg-green-500" : "bg-gray-400"}`} />
            </div>
            <div>
              <h2 className="font-semibold text-sm md:text-base text-foreground truncate max-w-[150px] md:max-w-none">
                {participant?.full_name}
              </h2>
              <UserStatus 
                isOnline={participant?.is_online} 
                lastSeen={participant?.last_seen}
              />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleReport}>
                Report User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBlock}>
                Block User
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this conversation?')) {
                    supabase
                      .from('conversations')
                      .delete()
                      .eq('id', conversation.id)
                      .then(() => {
                        navigate('/chat');
                      })
                      .catch((error) => {
                        console.error('Error deleting conversation:', error);
                      });
                  }
                }} 
                className="text-destructive"
              >
                Delete Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};