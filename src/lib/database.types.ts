export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  storage: {
    buckets: {
      Row: {
        id: string
        name: string
        public: boolean
        created_at: string | null
        updated_at: string | null
      }
      Insert: {
        id: string
        name: string
        public: boolean
        created_at?: string | null
        updated_at?: string | null
      }
      Update: {
        id?: string
        name?: string
        public?: boolean
        created_at?: string | null
        updated_at?: string | null
      }
    }
    objects: {
      Row: {
        id: string
        bucket_id: string
        name: string
        owner: string
        created_at: string
        updated_at: string
        last_accessed_at: string
        metadata: Record<string, any>
      }
    }
  }
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          native_language: string | null
          learning_language: string | null
          proficiency_level: string | null
          learning_goal: string | null
          date_of_birth: string | null
          gender: string | null
          is_online: boolean
          last_seen: string | null
          streak_count: number
          streak_last_date: string | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          native_language?: string | null
          learning_language?: string | null
          proficiency_level?: string | null
          learning_goal?: string | null
          date_of_birth?: string | null
          gender?: string | null
          is_online?: boolean
          last_seen?: string | null
          streak_count?: number
          streak_last_date?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          native_language?: string | null
          learning_language?: string | null
          proficiency_level?: string | null
          learning_goal?: string | null
          date_of_birth?: string | null
          gender?: string | null
          is_online?: boolean
          last_seen?: string | null
          streak_count?: number
          streak_last_date?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          bio: string | null
          likes_count: number | null
          is_online: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          username?: string | null
          bio?: string | null
          likes_count?: number | null
          is_online?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          bio?: string | null
          likes_count?: number | null
          is_online?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
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
          last_read_at: string | null;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          last_read_at?: string | null;
        };
        Update: {
          conversation_id?: string;
          user_id?: string;
          last_read_at?: string | null;
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
          user_id: string
          is_complete: boolean
          current_step: string | null
          native_language: string | null
          learning_language: string | null
          proficiency_level: string | null
          learning_goal: string | null
          date_of_birth: string | null
          gender: string | null
          avatar_url: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          is_complete?: boolean
          current_step?: string | null
          native_language?: string | null
          learning_language?: string | null
          proficiency_level?: string | null
          learning_goal?: string | null
          date_of_birth?: string | null
          gender?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          is_complete?: boolean
          current_step?: string | null
          native_language?: string | null
          learning_language?: string | null
          proficiency_level?: string | null
          learning_goal?: string | null
          date_of_birth?: string | null
          gender?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updateable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type Profile = Database['public']['Tables']['users']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'] & {
  participants?: Profile[];
  last_message?: Message;
};
export type ConversationParticipant = Database['public']['Tables']['conversation_participants']['Row'];
export type MessageReaction = Database['public']['Tables']['message_reactions']['Row'];
export type UserLike = Database['public']['Tables']['user_likes']['Row'];