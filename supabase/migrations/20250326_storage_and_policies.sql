
-- Enable storage
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- Create storage policies
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS interests text[],
ADD COLUMN IF NOT EXISTS learning_progress jsonb DEFAULT '{
  "vocabulary": 0,
  "grammar": 0,
  "speaking": 0,
  "listening": 0
}'::jsonb;

-- Create achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  date timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, title)
);

-- Add RLS policies for achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements"
  ON public.achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own achievements"
  ON public.achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add policies for avatar updates
CREATE POLICY "Users can update their own avatar_url"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add trigger to update profile when user updates avatar
CREATE OR REPLACE FUNCTION public.handle_avatar_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET avatar_url = NEW.avatar_url
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_avatar_update
  AFTER UPDATE OF avatar_url ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_avatar_update();
