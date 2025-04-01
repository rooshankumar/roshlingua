
-- Function to award XP points
CREATE OR REPLACE FUNCTION award_xp(
  user_id UUID,
  points INTEGER
) RETURNS INTEGER AS $$
DECLARE
  current_xp INTEGER;
  new_level TEXT;
BEGIN
  -- Get current XP
  SELECT xp_points INTO current_xp
  FROM profiles
  WHERE id = user_id;

  -- Add new points
  UPDATE profiles 
  SET 
    xp_points = COALESCE(xp_points, 0) + points,
    proficiency_level = CASE
      WHEN COALESCE(xp_points, 0) + points >= 1000 THEN 'advanced'
      WHEN COALESCE(xp_points, 0) + points >= 500 THEN 'intermediate'
      ELSE 'beginner'
    END
  WHERE id = user_id;

  RETURN COALESCE(current_xp, 0) + points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak() RETURNS trigger AS $$
BEGIN
  -- If this is the user's first activity today
  IF (
    NEW.last_active_at::date > OLD.last_active_at::date OR 
    OLD.last_active_at IS NULL
  ) THEN
    -- If last activity was yesterday, increment streak
    IF (
      OLD.last_active_at IS NULL OR 
      NEW.last_active_at::date = OLD.last_active_at::date + interval '1 day'
    ) THEN
      NEW.streak_count := COALESCE(OLD.streak_count, 0) + 1;
    -- If more than a day has passed, reset streak to 1
    ELSE
      NEW.streak_count := 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for streak updates
DROP TRIGGER IF EXISTS update_streak_trigger ON profiles;
CREATE TRIGGER update_streak_trigger
  BEFORE UPDATE OF last_active_at ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_streak();

-- Trigger function to calculate progress percentage
CREATE OR REPLACE FUNCTION calculate_progress() RETURNS trigger AS $$
BEGIN
  CASE 
    WHEN NEW.proficiency_level = 'advanced' THEN
      NEW.progress_percentage := 100;
    WHEN NEW.proficiency_level = 'intermediate' THEN
      NEW.progress_percentage := 66;
    ELSE 
      NEW.progress_percentage := (COALESCE(NEW.xp_points, 0)::float / 500 * 33)::integer;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for progress calculation
DROP TRIGGER IF EXISTS calculate_progress_trigger ON profiles;
CREATE TRIGGER calculate_progress_trigger
  BEFORE UPDATE OR INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_progress();
