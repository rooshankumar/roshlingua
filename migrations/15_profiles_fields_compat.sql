-- 15_profiles_fields_compat.sql
-- Purpose: Add commonly used profile fields expected by Settings/Profile UI and backfill
-- Safe to run multiple times.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS native_language text,
  ADD COLUMN IF NOT EXISTS learning_language text,
  ADD COLUMN IF NOT EXISTS proficiency_level text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS bio text;

-- If your schema has learning_languages (array), prefer its first element
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='learning_languages'
  ) THEN
    UPDATE public.profiles
    SET learning_language = COALESCE(
      learning_language,
      (CASE WHEN array_length((learning_languages)::text[], 1) >= 1 THEN (learning_languages::text[])[1] ELSE NULL END)
    )
    WHERE learning_language IS NULL;
  END IF;
END $$;

COMMIT;
