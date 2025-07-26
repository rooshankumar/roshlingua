
import { Message, User, Conversation } from '@/types/chat';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

export const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return format(date, 'h:mm a');
};

export const formatMessageDate = (timestamp: string) => {
  const date = new Date(timestamp);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
};

export const getDateKey = (timestamp: string) => {
  const date = new Date(timestamp);
  return format(date, 'yyyy-MM-dd');
};

export const formatLastSeen = (timestamp: string | undefined) => {
  if (!timestamp) return 'Offline';
  return `Last seen ${formatDistanceToNow(new Date(timestamp))} ago`;
};

export const formatRelativeTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
  
  return format(date, 'MMM d');
};

export const getOtherParticipant = (conversation: Conversation, currentUserId: string) => {
  return conversation.participants.find(p => p.user_id !== currentUserId) || conversation.participants[0];
};

export const getMessagesByConversation = (messages: Message[], conversationId: string) => {
  return messages.filter(m => m.conversation_id === conversationId);
};

export const groupMessagesByDate = (messages: Message[]) => {
  const groups = messages.reduce((acc, message) => {
    const date = format(new Date(message.created_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(message);
    return acc;
  }, {} as Record<string, Message[]>);

  return Object.entries(groups);
};


