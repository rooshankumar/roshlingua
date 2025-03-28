import { Database } from "@/integrations/supabase/types";

export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type ConversationParticipant = Database["public"]["Tables"]["conversation_participants"]["Row"];

export interface ChatMessage extends Message {
  sender?: {
    id: string;
    avatar_url?: string;
    full_name?: string;
  };
}

export interface ChatConversation extends Conversation {
  participants: ConversationParticipant[];
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
}