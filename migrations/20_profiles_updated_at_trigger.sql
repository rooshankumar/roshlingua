-- 20_profiles_updated_at_trigger.sql
-- Purpose: Keep profiles.updated_at fresh on every UPDATE to improve realtime UX and ordering
-- Safe to run multiple times.

BEGIN;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
