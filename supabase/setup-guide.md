
# Supabase Setup Guide for Languagelandia

This guide provides step-by-step instructions to set up the backend for Languagelandia using Supabase.

## Prerequisites

- A Supabase account
- Node.js and npm installed
- Git installed

## Step 1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.io/)
2. Click "New Project"
3. Enter project details:
   - Name: Languagelandia
   - Database Password: Create a strong password
   - Region: Choose one closest to your target audience
4. Click "Create New Project"

## Step 2: Set Up Database Schema

1. In your Supabase project, go to "SQL Editor"
2. Create a new query
3. Copy and paste the contents of the `schema.sql` file
4. Run the SQL script

## Step 3: Create Storage Buckets

1. Go to "Storage" in your Supabase dashboard
2. Create the following buckets:
   - **avatars**: For user profile pictures
     - Bucket Settings:
       - Public bucket: ON
       - File size limit: 5MB
       - Allowed MIME types: image/png, image/jpeg, image/gif
   - **attachments**: For chat message attachments
     - Bucket Settings:
       - Public bucket: ON
       - File size limit: 20MB
       - Allowed MIME types: image/*, application/pdf, application/msword

## Step 4: Set Up Authentication

1. Go to "Authentication" > "Settings"
2. Configure Email Auth:
   - Enable "Email" provider
   - Disable "Email confirmations" for development (enable in production)
3. Configure OAuth Providers (for Google login):
   - Enable "Google" provider
   - Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
   - Add the redirect URL from Supabase to your Google OAuth settings
   - Enter your Google Client ID and Secret in Supabase

## Step 5: Set Up Row Level Security (RLS) Policies

1. Go to "Authentication" > "Policies"
2. For each table, add appropriate policies:

### Users Table
```sql
-- Allow users to read their own data and public data
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own data
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### Profiles Table
```sql
-- Anyone can read profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

### Messages Table
```sql
-- Users can read messages in conversations they participate in
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
    )
  );

-- Users can insert messages in conversations they participate in
CREATE POLICY "Users can insert messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    auth.uid() IN (
      SELECT user_id FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
    )
  );
```

Apply similar RLS policies to other tables as needed.

## Step 6: Set Up Edge Functions (Optional)

For features like streak counting and notifications:

1. Go to "Edge Functions" in your Supabase dashboard
2. Create a new function called "update-streak":
   ```js
   // update-streak.js
   export async function handler(event, context) {
     const { data, error } = await supabase
       .from('users')
       .select('id, streak_count, streak_last_date')
       .eq('id', event.body.user_id)
       .single();
     
     if (error) return { statusCode: 400, body: error.message };
     
     // Logic to update streak based on last login date
     // ...

     return { statusCode: 200, body: JSON.stringify({ success: true }) };
   }
   ```

## Step 7: Connect to Frontend

1. Install Supabase client in your React project:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Create a Supabase client file in your project:

   ```typescript
   // src/lib/supabase.ts
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```

3. Create a `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

## Step 8: Set Up Realtime Features

1. Go to "Database" > "Replication" in your Supabase dashboard
2. Enable realtime for the following tables:
   - messages
   - profiles (for online status)
   - conversation_participants (for read status)

## Additional Resources

- [Supabase Documentation](https://supabase.io/docs)
- [Supabase JavaScript Client](https://supabase.io/docs/reference/javascript/supabase-client)
- [Supabase Auth Helpers](https://supabase.io/docs/guides/auth)
