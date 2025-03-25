
# Roslingua Database Schema

## Tables

### users
| Column               | Type                  | Nullable | Default               |
|----------------------|-----------------------|----------|------------------------|
| id                   | uuid                  | No       | None                  |
| email                | text                  | No       | None                  |
| full_name            | text                  | No       | None                  |
| gender               | text                  | Yes      | None                  |
| date_of_birth        | date                  | Yes      | None                  |
| native_language      | text                  | No       | 'English'             |
| learning_language    | text                  | No       | 'Spanish'             |
| proficiency_level    | text                  | No       | 'beginner'            |
| learning_goal        | text                  | Yes      | None                  |
| avatar_url           | text                  | Yes      | None                  |
| created_at           | timestamp with tz     | Yes      | now()                 |
| updated_at           | timestamp with tz     | Yes      | now()                 |
| last_login           | timestamp with tz     | Yes      | now()                 |
| streak_count         | integer               | Yes      | 0                     |
| streak_last_date     | date                  | Yes      | None                  |

### profiles
| Column               | Type                  | Nullable | Default               |
|----------------------|-----------------------|----------|------------------------|
| id                   | uuid                  | No       | None                  |
| username             | text                  | Yes      | None                  |
| bio                  | text                  | Yes      | None                  |
| is_online            | boolean               | Yes      | false                 |
| likes_count          | integer               | Yes      | 0                     |
| created_at           | timestamp with tz     | Yes      | now()                 |
| updated_at           | timestamp with tz     | Yes      | now()                 |
| avatar_url           | text                  | Yes      | None                  |

### onboarding_status
| Column               | Type                  | Nullable | Default               |
|----------------------|-----------------------|----------|------------------------|
| user_id              | uuid                  | No       | None                  |
| is_complete          | boolean               | Yes      | false                 |
| current_step         | text                  | Yes      | 'profile'             |
| updated_at           | timestamp with tz     | Yes      | now()                 |

### conversations
| Column               | Type                  | Nullable | Default               |
|----------------------|-----------------------|----------|------------------------|
| id                   | uuid                  | No       | gen_random_uuid()     |
| created_at           | timestamp with tz     | Yes      | now()                 |
| updated_at           | timestamp with tz     | Yes      | now()                 |

### conversation_participants
| Column               | Type                  | Nullable | Default               |
|----------------------|-----------------------|----------|------------------------|
| conversation_id      | uuid                  | No       | None                  |
| user_id              | uuid                  | No       | None                  |
| last_read_at         | timestamp with tz     | Yes      | now()                 |

### messages
| Column               | Type                  | Nullable | Default               |
|----------------------|-----------------------|----------|------------------------|
| id                   | uuid                  | No       | gen_random_uuid()     |
| conversation_id      | uuid                  | Yes      | None                  |
| sender_id            | uuid                  | Yes      | None                  |
| content              | text                  | No       | None                  |
| is_read              | boolean               | Yes      | false                 |
| created_at           | timestamp with tz     | Yes      | now()                 |

### message_reactions
| Column               | Type                  | Nullable | Default               |
|----------------------|-----------------------|----------|------------------------|
| message_id           | uuid                  | No       | None                  |
| user_id              | uuid                  | No       | None                  |
| reaction             | text                  | No       | None                  |
| created_at           | timestamp with tz     | Yes      | now()                 |

### user_likes
| Column               | Type                  | Nullable | Default               |
|----------------------|-----------------------|----------|------------------------|
| liker_id             | uuid                  | No       | None                  |
| liked_id             | uuid                  | No       | None                  |
| created_at           | timestamp with tz     | Yes      | now()                 |

## Relationships

- `profiles.id` references `auth.users.id` (one-to-one)
- `onboarding_status.user_id` references `auth.users.id` (one-to-one)
- `conversation_participants.user_id` references `auth.users.id` (many-to-many)
- `conversation_participants.conversation_id` references `conversations.id` (many-to-one)
- `messages.conversation_id` references `conversations.id` (many-to-one)
- `messages.sender_id` references `auth.users.id` (many-to-one)
- `message_reactions.message_id` references `messages.id` (many-to-one)
- `message_reactions.user_id` references `auth.users.id` (many-to-one)
- `user_likes.liker_id` references `auth.users.id` (many-to-many)
- `user_likes.liked_id` references `auth.users.id` (many-to-many)

## Storage Buckets

### avatars
- Purpose: Stores user profile pictures
- Public access: Yes
- Size limits: 5MB per file
- Allowed file types: image/*

## Database Functions

1. `create_user_with_onboarding(p_user_id uuid, p_email text, p_full_name text)` - Creates a new user with default profile and onboarding status
2. `handle_new_user()` - Trigger function to set up profiles and onboarding status for new auth users
3. `increment(x integer)` - Helper function for incrementing values 
4. `decrement(x integer)` - Helper function for decrementing values

## Row Level Security Policies

All tables have Row Level Security enabled with policies that restrict access to:
- Users can only see and modify their own data
- Public profiles are visible to all authenticated users
- Messages are only visible to conversation participants
