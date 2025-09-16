-- 10_profiles_compat.sql
-- Purpose: Bring the profiles table to parity with current frontend expectations
-- Safe to run multiple times.

BEGIN;

-- 1) Compatibility columns expected by the app
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS xp_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_percentage integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_count integer NOT NULL DEFAULT 0;

-- 2) Backfill full_name from display_name when missing
UPDATE public.profiles
SET full_name = COALESCE(full_name, display_name)
WHERE full_name IS NULL;

-- 3) Optional: username unique index (case-insensitive) when present
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles ((lower(username)))
  WHERE username IS NOT NULL;

-- 4) Keep full_name and display_name in sync (best-effort)
CREATE OR REPLACE FUNCTION public.profiles_sync_name()
RETURNS trigger AS $$
BEGIN
  -- If only display_name is provided, mirror to full_name
  IF NEW.full_name IS NULL AND NEW.display_name IS NOT NULL THEN
    NEW.full_name := NEW.display_name;
  END IF;

  -- If only full_name is provided, mirror to display_name
  IF NEW.display_name IS NULL AND NEW.full_name IS NOT NULL THEN
    NEW.display_name := NEW.full_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profiles_sync_name ON public.profiles;
CREATE TRIGGER trg_profiles_sync_name
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_sync_name();

COMMIT;
