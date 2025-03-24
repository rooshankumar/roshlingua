
# Languagelandia Database Schema Documentation

This document outlines the database schema used in the Languagelandia application, including tables, relationships, and security policies.

## Tables

### 1. users
Primary table that stores user information.

| Column | Type | Description | Nullable | Default |
|--------|------|-------------|----------|---------|
| id | UUID | Primary key, references auth.users | No | uuid_generate_v4() |
| email | TEXT | User's email address | No | None |
| full_name | TEXT | User's full name | No | None |
| gender | TEXT | User's gender | Yes | None |
| date_of_birth | DATE | User's date of birth | Yes | None |
| native_language | TEXT | User's native language | No | None |
| learning_language | TEXT | Language the user is learning | No | None |
| proficiency_level | TEXT | User's proficiency level | No | None |
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
| id | UUID | Primary key, references users(id) | No | None |
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
| user_id | UUID | References users(id) | No | None |
| last_read_at | TIMESTAMP WITH TIME ZONE | When the user last read the conversation | Yes | now() |

### 5. messages
Stores chat messages.

| Column | Type | Description | Nullable | Default |
|--------|------|-------------|----------|---------|
| id | UUID | Primary key | No | uuid_generate_v4() |
| conversation_id | UUID | References conversations(id) | Yes | None |
| sender_id | UUID | References users(id) | Yes | None |
| content | TEXT | Message content | No | None |
| created_at | TIMESTAMP WITH TIME ZONE | When the message was created | Yes | now() |
| is_read | BOOLEAN | Whether the message has been read | Yes | false |

### 6. message_reactions
Stores reactions to messages.

| Column | Type | Description | Nullable | Default |
|--------|------|-------------|----------|---------|
| message_id | UUID | References messages(id) | No | None |
| user_id | UUID | References users(id) | No | None |
| reaction | TEXT | Type of reaction | No | None |
| created_at | TIMESTAMP WITH TIME ZONE | When the reaction was created | Yes | now() |

### 7. user_likes
Tracks users liking other users.

| Column | Type | Description | Nullable | Default |
|--------|------|-------------|----------|---------|
| liker_id | UUID | References users(id) | No | None |
| liked_id | UUID | References users(id) | No | None |
| created_at | TIMESTAMP WITH TIME ZONE | When the like was created | Yes | now() |

### 8. onboarding_status
Tracks user onboarding progress.

| Column | Type | Description | Nullable | Default |
|--------|------|-------------|----------|---------|
| user_id | UUID | References users(id) | No | None |
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
AS $function$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$function$
```

### create_user_with_onboarding()
Function to create a new user with onboarding status.

```sql
CREATE OR REPLACE FUNCTION public.create_user_with_onboarding(
  p_user_id uuid, 
  p_email text, 
  p_full_name text, 
  p_native_language text DEFAULT 'English'::text, 
  p_learning_language text DEFAULT 'Spanish'::text, 
  p_proficiency_level text DEFAULT 'beginner'::text
) RETURNS TABLE(is_new_user boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_exists boolean;
  v_is_new boolean;
  v_error_message text;
begin
  -- Input validation
  if p_email is null or p_full_name is null then
    raise exception 'Email and full name are required';
  end if;

  -- Check if user already exists
  select exists(select 1 from users where id = p_user_id) into v_exists;
  v_is_new := not v_exists;

  -- Create user if doesn't exist
  if not v_exists then
    begin
      insert into users (
        id,
        email,
        full_name,
        native_language,
        learning_language,
        proficiency_level,
        created_at,
        updated_at,
        last_login,
        streak_count
      ) values (
        p_user_id,
        p_email,
        p_full_name,
        p_native_language,
        p_learning_language,
        p_proficiency_level,
        now(),
        now(),
        now(),
        0
      );

      -- Create onboarding status
      insert into onboarding_status (
        user_id,
        is_complete
      ) values (
        p_user_id,
        false
      );
    exception
      when unique_violation then
        raise exception 'User with this email already exists';
      when others then
        get stacked diagnostics v_error_message = message_text;
        raise exception 'Error creating user: %', v_error_message;
    end;
  end if;

  return query select v_is_new as is_new_user;
end;
$function$
```

## Database Triggers

### on_auth_user_created
Trigger to create a profile when a new auth user is created.

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Issue Analysis and Recommendations

Based on the error messages and database schema, the following issues have been identified:

1. **Foreign Key Constraint Violation**: The error "profiles_id_fkey" suggests that when a new user signs up via Google OAuth, it's attempting to create a profile before the user record exists in the users table. This is likely because:
   - The `handle_new_user()` trigger tries to insert into profiles immediately after auth.users is created
   - But there may be a timing issue where the users table record isn't created yet

2. **Missing Create User Logic**: When a new user signs up, we need to ensure:
   - A record is created in the users table
   - A record is created in the profiles table
   - An onboarding_status record is created

3. **Recommended Fix**:
   - Update the AuthCallback component to explicitly create user records
   - Use the create_user_with_onboarding function to ensure all necessary records are created
   - Implement proper error handling and fallbacks for each step
   - Ensure proper redirects to onboarding for new users

4. **Google OAuth Configuration**:
   - Ensure redirect URLs are correctly configured in both Google Cloud Console and Supabase
   - Verify that callback URLs match exactly to prevent redirection issues

## Storage Buckets

There are currently no storage buckets configured in the Supabase project. Consider creating:
- avatars: For user profile pictures
- attachments: For chat message attachments (images, documents, etc.)
