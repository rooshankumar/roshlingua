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
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  translation?: string;
  created_at: string;
  is_read: boolean;
  language: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_thumbnail?: string | null;
  sender?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    last_seen?: string;
  };
  is_delivered?: boolean;
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