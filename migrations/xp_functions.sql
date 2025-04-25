
-- Constants for XP rewards
CREATE OR REPLACE FUNCTION get_xp_rewards()
RETURNS TABLE (
    action_type TEXT,
    base_points INTEGER,
    streak_multiplier DECIMAL
) AS $$
    SELECT * FROM (
        VALUES
            ('lesson_complete', 50, 1.2),      -- Base XP for completing a lesson
            ('conversation_started', 30, 1.1),  -- Starting a conversation
            ('message_sent', 5, 1.0),          -- Sending a message
            ('daily_login', 20, 1.3),          -- Daily login bonus
            ('profile_complete', 100, 1.0),    -- One-time profile completion
            ('achievement_unlock', 75, 1.0)     -- Achievement unlocking
    ) AS rewards(action_type, base_points, streak_multiplier);
$$ LANGUAGE SQL IMMUTABLE;

-- Function to calculate streak bonus
CREATE OR REPLACE FUNCTION calculate_streak_bonus(
    base_xp INTEGER,
    streak_count INTEGER,
    multiplier DECIMAL
) RETURNS INTEGER AS $$
BEGIN
    -- Cap streak bonus at 7 days
    RETURN FLOOR(base_xp * POWER(multiplier, LEAST(streak_count, 7)))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Main XP increment function
CREATE OR REPLACE FUNCTION increment_xp(
    user_id UUID,
    action_type TEXT
) RETURNS TABLE (
    xp_points INTEGER,
    xp_gained INTEGER
) LANGUAGE plpgsql AS $$
DECLARE
    base_points INTEGER;
    streak_multiplier DECIMAL;
    streak_count INTEGER;
    xp_to_add INTEGER;
BEGIN
    -- Get base XP and multiplier for action
    SELECT r.base_points, r.streak_multiplier 
    INTO base_points, streak_multiplier
    FROM get_xp_rewards() r 
    WHERE r.action_type = increment_xp.action_type;

    -- Get user's current streak
    SELECT COALESCE(p.streak_count, 0)
    INTO streak_count
    FROM profiles p
    WHERE p.id = user_id;

    -- Calculate XP with streak bonus
    xp_to_add := calculate_streak_bonus(base_points, streak_count, streak_multiplier);

    -- Update user's XP
    RETURN QUERY
    UPDATE profiles
    SET xp_points = COALESCE(xp_points, 0) + xp_to_add
    WHERE id = user_id
    RETURNING xp_points, xp_to_add;
END;
$$;
