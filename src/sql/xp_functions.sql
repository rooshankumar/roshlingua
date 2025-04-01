
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
