
# Languagelandia Database Schema Documentation

This document outlines the database schema used in the Languagelandia application, including tables, relationships, and security policies.

## Tables

### 1. users
Primary table that stores user information.

| Column | Type | Description | Nullable | Default |
|--------|------|-------------|----------|---------|
| id | UUID | Primary key, references auth.users | No | None |
| email | TEXT | User's email address | No | None |
| full_name | TEXT | User's full name | No | None |
| gender | TEXT | User's gender | Yes | None |
| date_of_birth | DATE | User's date of birth | Yes | None |
| native_language | TEXT | User's native language | No | 'English' |
| learning_language | TEXT | Language the user is learning | No | 'Spanish' |
| proficiency_level | TEXT | User's proficiency level | No | 'beginner' |
| learning_goal | TEXT | User's learning goal | Yes | None |
| avatar_url | TEXT | URL to user's avatar | Yes | None |
| created_at | TIMESTAMP WITH TIME ZONE | When the user was created | Yes | now() |
| updated_at | TIMESTAMP WITH TIME ZONE | When the user was last updated | Yes | now() |
| last_login | TIMESTAMP WITH TIME ZONE | When the user last logged in | Yes | now() |
| streak_count | INTEGER | User's learning streak count | Yes | 0 |
| streak_last_date | DATE | Last date user maintained streak | Yes | None |

### 2. profiles
Public user data and profile information.

| Column | Type | Description | Nullable | Default |
|--------|------|-------------|----------|---------|
| id | UUID | Primary key, references auth.users | No | None |
| username | TEXT | User's username | Yes | None |
| bio | TEXT | User's biography | Yes | None |
| is_online | BOOLEAN | Whether user is online | Yes | false |
| likes_count | INTEGER | Number of likes received | Yes | 0 |
| created_at | TIMESTAMP WITH TIME ZONE | When the profile was created | Yes | now() |
| updated_at | TIMESTAMP WITH TIME ZONE | When the profile was last updated | Yes | now() |

### 3. conversations
Stores chat conversations.

| Column | Type | Description | Nullable | Default |
|--------|------|-------------|----------|---------|
| id | UUID | Primary key | No | uuid_generate_v4() |
| created_at | TIMESTAMP WITH TIME ZONE | When the conversation was created | Yes | now() |
| updated_at | TIMESTAMP WITH TIME ZONE | When the conversation was last updated | Yes | now() |

### 4. conversation_participants
Links users to conversations.

| Column | Type | Description | Nullable | Default |
|--------|------|-------------|----------|---------|
| conversation_id | UUID | References conversations(id) | No | None |
| user_id | UUID | References auth.users | No | None |
| last_read_at | TIMESTAMP WITH TIME ZONE | When the user last read the conversation | Yes | now() |

### 5. messages
Stores chat messages.

| Column | Type | Description | Nullable | Default |
|--------|------|-------------|----------|---------|
| id | UUID | Primary key | No | uuid_generate_v4() |
| conversation_id | UUID | References conversations(id) | Yes | None |
| sender_id | UUID | References auth.users | Yes | None |
| content | TEXT | Message content | No | None |
| created_at | TIMESTAMP WITH TIME ZONE | When the message was created | Yes | now() |
| is_read | BOOLEAN | Whether the message has been read | Yes | false |

### 6. message_reactions
Stores reactions to messages.

| Column | Type | Description | Nullable | Default |
|--------|------|-------------|----------|---------|
| message_id | UUID | References messages(id) | No | None |
| user_id | UUID | References auth.users | No | None |
| reaction | TEXT | Type of reaction | No | None |
| created_at | TIMESTAMP WITH TIME ZONE | When the reaction was created | Yes | now() |

### 7. user_likes
Tracks users liking other users.

| Column | Type | Description | Nullable | Default |
|--------|------|-------------|----------|---------|
| liker_id | UUID | References auth.users | No | None |
| liked_id | UUID | References auth.users | No | None |
| created_at | TIMESTAMP WITH TIME ZONE | When the like was created | Yes | now() |

### 8. onboarding_status
Tracks user onboarding progress.

| Column | Type | Description | Nullable | Default |
|--------|------|-------------|----------|---------|
| user_id | UUID | References auth.users | No | None |
| is_complete | BOOLEAN | Whether onboarding is complete | Yes | false |
| current_step | TEXT | Current onboarding step | Yes | 'profile' |
| updated_at | TIMESTAMP WITH TIME ZONE | When the status was last updated | Yes | now() |

## Database Functions

### handle_new_user()
Trigger function that creates a profile when a new auth user is created.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into profiles first
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  
  -- Set up onboarding status
  INSERT INTO public.onboarding_status (user_id, is_complete, current_step)
  VALUES (NEW.id, false, 'profile')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
```

### create_user_with_onboarding()
Function to create a new user with onboarding status.

```sql
CREATE OR REPLACE FUNCTION create_user_with_onboarding(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_native_language text DEFAULT 'English'::text,
  p_learning_language text DEFAULT 'Spanish'::text,
  p_proficiency_level text DEFAULT 'beginner'::text
)
RETURNS TABLE(is_new_user boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
  v_is_new boolean;
BEGIN
  -- Check if user exists in our users table
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = p_user_id) INTO v_exists;
  v_is_new := NOT v_exists;
  
  -- Only insert if the user doesn't exist
  IF NOT v_exists THEN
    BEGIN
      -- Insert into users table
      INSERT INTO public.users (
        id, email, full_name, native_language, 
        learning_language, proficiency_level
      ) VALUES (
        p_user_id, p_email, p_full_name, p_native_language,
        p_learning_language, p_proficiency_level
      );
      
      -- Profile should be created by trigger, but ensure it exists
      INSERT INTO public.profiles (id)
      VALUES (p_user_id)
      ON CONFLICT (id) DO NOTHING;
      
      -- Ensure onboarding status is created
      INSERT INTO public.onboarding_status (user_id, is_complete)
      VALUES (p_user_id, false)
      ON CONFLICT (user_id) DO NOTHING;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail
      RAISE NOTICE 'Error in create_user_with_onboarding: %', SQLERRM;
    END;
  END IF;
  
  RETURN QUERY SELECT v_is_new;
END;
$$;
```

## RLS Policies

To ensure proper security, the database uses Row-Level Security (RLS) policies:

1. **Users Table**:
   - Users can view and update only their own records

2. **Profiles Table**:
   - Profiles are viewable by everyone
   - Users can only update their own profile

3. **Onboarding Status Table**:
   - Users can view and update only their own onboarding status

4. **Conversations & Messages**:
   - Users can only see conversations they are participants in
   - Users can only insert messages in conversations they are part of

5. **User Likes**:
   - Anyone can view likes (public data)
   - Users can only create and delete their own likes

## Key Design Decisions & Fix Summary

1. **Foreign Key References**:
   - All tables have proper foreign key relationships to auth.users, ensuring data integrity.
   - This fixes the issue where user records were not properly linked, causing authentication failures.

2. **Trigger Setup**:
   - The handle_new_user trigger automatically creates profile and onboarding records when a user is created.
   - This addresses the issue where profiles weren't being created for new Google OAuth users.

3. **Fallback Mechanism**:
   - Added a create_user_with_onboarding function with fallback logic in case the trigger mechanism fails.
   - This provides a second chance for user creation if the primary method encounters an error.

4. **Row-Level Security**:
   - Implemented granular RLS policies to ensure data security while allowing necessary access.
   - This balances security needs with functional requirements.

5. **Real-time Features**:
   - The useRealtimeProfile hook enables real-time updates of profile data when changes occur.
   - This ensures the UI always reflects the latest data without manual refreshing.
