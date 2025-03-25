
// This file provides TypeScript interfaces for our database schema

export interface User {
  id: string;
  email: string;
  full_name: string;
  gender?: string;
  date_of_birth?: string;
  native_language: string;
  learning_language: string;
  proficiency_level: string;
  learning_goal?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  last_login: string;
  streak_count: number;
  streak_last_date?: string;
}

export interface Profile {
  id: string;
  username?: string;
  bio?: string;
  is_online: boolean;
  likes_count: number;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface MessageReaction {
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

export interface UserLike {
  liker_id: string;
  liked_id: string;
  created_at: string;
}

export interface OnboardingStatus {
  user_id: string;
  is_complete: boolean;
  current_step: string;
  updated_at: string;
}
