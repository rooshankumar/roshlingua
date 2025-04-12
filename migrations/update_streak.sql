
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  last_date DATE;
BEGIN
  -- Get the user's last streak date
  SELECT streak_last_date::date INTO last_date FROM public.users WHERE id = NEW.id;

  -- If no previous date exists, initialize streak
  IF last_date IS NULL THEN
    NEW.streak_count = 1;
    NEW.streak_last_date = CURRENT_DATE;
  ELSE
    -- If the user visits on the next day, increment streak
    IF CURRENT_DATE = last_date + INTERVAL '1 day' THEN
      NEW.streak_count = NEW.streak_count + 1;
      NEW.streak_last_date = CURRENT_DATE;
    -- If the user visits on the same day, keep streak
    ELSIF CURRENT_DATE = last_date THEN
      -- Do nothing, keep current streak
      NULL;
    -- If the user skips a day, reset streak
    ELSE
      NEW.streak_count = 1;
      NEW.streak_last_date = CURRENT_DATE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS update_user_streak_trigger ON public.users;
CREATE TRIGGER update_user_streak_trigger
  BEFORE UPDATE OF last_seen
  ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_streak();
