
-- Function to safely increment XP
CREATE OR REPLACE FUNCTION increment_xp(user_id UUID, xp_increment INTEGER)
RETURNS TABLE (xp_points INTEGER) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE profiles
  SET xp_points = COALESCE(xp_points, 0) + xp_increment
  WHERE id = user_id
  RETURNING xp_points;
END;
$$;
