
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          gender: string | null;
          date_of_birth: string | null;
          native_language: string;
          learning_language: string;
          proficiency_level: string;
          learning_goal: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          last_login: string;
          streak_count: number;
          streak_last_date: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          gender?: string | null;
          date_of_birth?: string | null;
          native_language: string;
          learning_language: string;
          proficiency_level: string;
          learning_goal?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          last_login?: string;
          streak_count?: number;
          streak_last_date?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          gender?: string | null;
          date_of_birth?: string | null;
          native_language?: string;
          learning_language?: string;
          proficiency_level?: string;
          learning_goal?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          last_login?: string;
          streak_count?: number;
          streak_last_date?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          bio: string | null;
          is_online: boolean;
          likes_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          bio?: string | null;
          is_online?: boolean;
          likes_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          bio?: string | null;
          is_online?: boolean;
          likes_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversation_participants: {
        Row: {
          conversation_id: string;
          user_id: string;
          last_read_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          last_read_at?: string;
        };
        Update: {
          conversation_id?: string;
          user_id?: string;
          last_read_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at: string;
          is_read: boolean;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at?: string;
          is_read?: boolean;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          created_at?: string;
          is_read?: boolean;
        };
      };
      message_reactions: {
        Row: {
          message_id: string;
          user_id: string;
          reaction: string;
          created_at: string;
        };
        Insert: {
          message_id: string;
          user_id: string;
          reaction: string;
          created_at?: string;
        };
        Update: {
          message_id?: string;
          user_id?: string;
          reaction?: string;
          created_at?: string;
        };
      };
      user_likes: {
        Row: {
          liker_id: string;
          liked_id: string;
          created_at: string;
        };
        Insert: {
          liker_id: string;
          liked_id: string;
          created_at?: string;
        };
        Update: {
          liker_id?: string;
          liked_id?: string;
          created_at?: string;
        };
      };
      onboarding_status: {
        Row: {
          user_id: string;
          is_complete: boolean;
          current_step: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          is_complete?: boolean;
          current_step?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          is_complete?: boolean;
          current_step?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Type shortcuts
export type User = Database['public']['Tables']['users']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  participants?: Profile[];
  last_message?: Message;
};
