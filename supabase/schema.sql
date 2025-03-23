
-- Schema for Languagelandia platform
-- This file contains all necessary tables, indexes, and storage buckets

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth DATE,
  native_language TEXT NOT NULL,
  learning_language TEXT NOT NULL,
  proficiency_level TEXT NOT NULL,
  learning_goal TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  streak_count INTEGER DEFAULT 0,
  streak_last_date DATE
);

-- PROFILES TABLE (public user data)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  bio TEXT,
  is_online BOOLEAN DEFAULT FALSE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CONVERSATION_PARTICIPANTS TABLE (linking users to conversations)
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

-- MESSAGE_REACTIONS TABLE
CREATE TABLE IF NOT EXISTS message_reactions (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- USER_LIKES TABLE (for the "heart" system)
CREATE TABLE IF NOT EXISTS user_likes (
  liker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  liked_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (liker_id, liked_id)
);

-- ONBOARDING_STATUS TABLE
CREATE TABLE IF NOT EXISTS onboarding_status (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_complete BOOLEAN DEFAULT FALSE,
  current_step TEXT DEFAULT 'profile',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_likes_liked_id ON user_likes(liked_id);

-- INSERT MOCK USERS for testing
INSERT INTO users (id, email, full_name, gender, date_of_birth, native_language, learning_language, proficiency_level, learning_goal, streak_count)
VALUES 
  ('d5c5d956-b154-4e40-b450-c33c1e2492bb', 'sophia@example.com', 'Sophia Chen', 'female', '1992-05-15', 'English', 'Spanish', 'intermediate', 'Become conversational in 3 months', 12),
  ('f7e92c8b-5bb8-49d7-8bbf-c605c4daa682', 'miguel@example.com', 'Miguel Rodriguez', 'male', '1988-10-22', 'Spanish', 'English', 'advanced', 'Improve business English', 8);

INSERT INTO profiles (id, username, bio, is_online, likes_count)
VALUES 
  ('d5c5d956-b154-4e40-b450-c33c1e2492bb', 'sophiachen', 'Language enthusiast working in tech. Love traveling and meeting new people!', TRUE, 24),
  ('f7e92c8b-5bb8-49d7-8bbf-c605c4daa682', 'miguel_r', 'Software engineer from Madrid. Passionate about coding and learning languages.', TRUE, 18);

INSERT INTO onboarding_status (user_id, is_complete)
VALUES 
  ('d5c5d956-b154-4e40-b450-c33c1e2492bb', TRUE),
  ('f7e92c8b-5bb8-49d7-8bbf-c605c4daa682', TRUE);

-- Create a conversation between the two mock users
INSERT INTO conversations (id)
VALUES ('b9e5c6a1-7d23-4c8f-9e4b-f2a8d65c7890');

INSERT INTO conversation_participants (conversation_id, user_id)
VALUES 
  ('b9e5c6a1-7d23-4c8f-9e4b-f2a8d65c7890', 'd5c5d956-b154-4e40-b450-c33c1e2492bb'),
  ('b9e5c6a1-7d23-4c8f-9e4b-f2a8d65c7890', 'f7e92c8b-5bb8-49d7-8bbf-c605c4daa682');

INSERT INTO messages (conversation_id, sender_id, content, is_read)
VALUES 
  ('b9e5c6a1-7d23-4c8f-9e4b-f2a8d65c7890', 'd5c5d956-b154-4e40-b450-c33c1e2492bb', 'Hola Miguel! Cómo estás?', TRUE),
  ('b9e5c6a1-7d23-4c8f-9e4b-f2a8d65c7890', 'f7e92c8b-5bb8-49d7-8bbf-c605c4daa682', 'Hi Sophia! I''m doing great. How is your Spanish practice going?', TRUE),
  ('b9e5c6a1-7d23-4c8f-9e4b-f2a8d65c7890', 'd5c5d956-b154-4e40-b450-c33c1e2492bb', 'It''s going well! I''ve been practicing daily. Can you check my pronunciation sometime?', FALSE);

-- Add some likes between users
INSERT INTO user_likes (liker_id, liked_id)
VALUES 
  ('d5c5d956-b154-4e40-b450-c33c1e2492bb', 'f7e92c8b-5bb8-49d7-8bbf-c605c4daa682'),
  ('f7e92c8b-5bb8-49d7-8bbf-c605c4daa682', 'd5c5d956-b154-4e40-b450-c33c1e2492bb');

-- STORAGE BUCKETS
-- We'll need to create these buckets in Supabase
-- avatars: For user profile pictures
-- attachments: For chat message attachments (images, documents, etc.)
