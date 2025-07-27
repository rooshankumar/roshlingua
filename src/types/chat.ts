export interface User {
  id: string;
  name: string;
  avatar: string;
  nativeLanguage: string;
  learningLanguage: string;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced';
  streakCount: number;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id?: string;
  recipient_id?: string;
  conversation_id?: string;
  created_at: string;
  updated_at?: string;
  message_type: 'text' | 'image' | 'file' | 'audio' | 'video';
  file_url?: string;
  file_name?: string;
  attachment_url?: string;
  attachment_name?: string;
  is_read: boolean;
  reply_to_id?: string;
  sender?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  receiver?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  reply_to?: {
    id: string;
    content: string;
    sender: {
      full_name: string;
    };
  };
  reactions?: MessageReaction[];
}

export interface Conversation {
  id: string;
  participants: User[];
  learningLanguage: string;
  lastMessage?: Message;
  createdAt: string;
  lastMessageAt: string;
  unreadCount: number; // Added unreadCount
}