
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
  return format(date, 'MMM d, yyyy');
};

export const formatLastSeen = (timestamp: string | undefined) => {
  if (!timestamp) return 'Offline';
  return `Last seen ${formatDistanceToNow(new Date(timestamp))} ago`;
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
