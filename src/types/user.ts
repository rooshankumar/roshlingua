
// User type represents the auth user
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  is_sso_user: boolean;
}

// Profile type represents user profile data
export interface Profile {
  id: string; // References user.id
  full_name: string;
  username: string;
  email: string;
  gender?: string;
  bio?: string;
  avatar_url?: string;
  native_language?: string;
  learning_language?: string;
  proficiency_level?: string;
  learning_goal?: string;
  streak_count: number;
  streak_last_date?: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
}
