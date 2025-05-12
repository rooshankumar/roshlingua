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
  conversation_id: string;
  sender_id: string;
  sender?: {
    id: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
    last_seen?: string;
  };
  is_read: boolean;
  is_delivered?: boolean;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_thumbnail?: string | null;
  created_at: string;
  reactions?: Record<string, string[]>;
  reply_to_id?: string | null;
  reply_to?: Message | null;
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