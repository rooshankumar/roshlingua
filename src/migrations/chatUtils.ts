
import { Conversation, Message, User } from "@/types/chat";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

export const getOtherParticipant = (conversation: Conversation, currentUserId: string): User => {
  return conversation.participants.find(p => p.id !== currentUserId) || conversation.participants[0];
};

export const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return format(date, "h:mm a");
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return format(date, "MMM d");
  }
};

export const formatLastSeen = (dateString: string | undefined): string => {
  if (!dateString) return "Not available";
  
  const date = new Date(dateString);
  return `Last seen ${formatDistanceToNow(date, { addSuffix: true })}`;
};

export const getMessagesByConversation = (
  messages: Message[],
  conversationId: string
): Message[] => {
  return messages
    .filter(message => message.conversation_id === conversationId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

export const groupMessagesByDate = (messages: Message[]): [string, Message[]][] => {
  const groups = messages.reduce((acc, message) => {
    const date = new Date(message.created_at);
    const key = format(date, "yyyy-MM-dd");
    
    if (!acc[key]) {
      acc[key] = [];
    }
    
    acc[key].push(message);
    return acc;
  }, {} as Record<string, Message[]>);
  
  return Object.entries(groups);
};

export const formatMessageDate = (dateString: string): string => {
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return "Today";
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return format(date, "EEEE, MMMM d");
  }
};
