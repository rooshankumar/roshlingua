
-- Add new columns to profiles table if they don't exist
DO $$ 
BEGIN
    -- Add streak_count if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' 
                  AND column_name = 'streak_count') THEN
        ALTER TABLE public.profiles ADD COLUMN streak_count INTEGER DEFAULT 0;
    END IF;

    -- Add xp_points if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' 
                  AND column_name = 'xp_points') THEN
        ALTER TABLE public.profiles ADD COLUMN xp_points INTEGER DEFAULT 0;
    END IF;

    -- Add proficiency_level if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' 
                  AND column_name = 'proficiency_level') THEN
        ALTER TABLE public.profiles ADD COLUMN proficiency_level TEXT DEFAULT 'beginner';
    END IF;

    -- Add last_seen if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' 
                  AND column_name = 'last_seen') THEN
        ALTER TABLE public.profiles ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Create index on last_seen for better performance
    IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                  WHERE tablename = 'profiles' 
                  AND indexname = 'idx_profiles_last_seen') THEN
        CREATE INDEX idx_profiles_last_seen ON public.profiles(last_seen);
    END IF;
END $$;

-- Add comment to columns for documentation
COMMENT ON COLUMN public.profiles.streak_count IS 'Number of consecutive days user has been active';
COMMENT ON COLUMN public.profiles.xp_points IS 'Experience points earned by user';
COMMENT ON COLUMN public.profiles.proficiency_level IS 'User''s current language proficiency level';
COMMENT ON COLUMN public.profiles.last_seen IS 'Timestamp of user''s last activity';
