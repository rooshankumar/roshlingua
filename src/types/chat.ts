
export interface User {
  id: string;
  name: string;
  avatar: string;
  lastSeen?: string;
  isOnline?: boolean;
}

export interface Message {
  id: string;
  conversation_id: string; // Changed to snake_case for Supabase compatibility
  sender_id: string;      // Changed to snake_case for Supabase compatibility
  recipient_id: string;   // Changed to snake_case for Supabase compatibility
  content: string;
  created_at: string;     // Changed to snake_case for Supabase compatibility
  is_read: boolean;       // Changed to snake_case for Supabase compatibility
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  createdAt: string;
  lastMessageAt: string;
  unreadCount?: number;
}
