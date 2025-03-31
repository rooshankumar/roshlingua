import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

interface Props {
  conversation: {
    id: string;
    participant: {
      id: string;
      email: string;
      full_name: string;
      avatar_url: string;
    };
  };
}

export const ChatHeader = ({ conversation }: Props) => {
  const navigate = useNavigate();
  const participant = conversation?.participant;

  if (!participant) {
    return <div className="flex items-center p-4 border-b">Loading...</div>;
  }

  return (
    <div className="flex items-center p-4 border-b">
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => navigate('/chat')}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex items-center ml-4">
        <Avatar>
          <AvatarImage src={participant.avatar_url || '/placeholder.svg'} />
          <AvatarFallback>
            {participant.full_name?.substring(0, 2).toUpperCase() || participant.email?.substring(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <h2 className="font-semibold">
            {participant.full_name || participant.email?.split('@')[0]}
          </h2>
          <p className="text-sm text-muted-foreground">{participant.email}</p>
        </div>
      </div>
    </div>
  );
};