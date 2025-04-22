
CREATE OR REPLACE FUNCTION public.handle_user_profile_upsert(
  user_id uuid,
  user_email text,
  current_timestamp timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at, last_seen)
  VALUES (
    user_id,
    user_email,
    current_timestamp,
    current_timestamp,
    current_timestamp
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = EXCLUDED.updated_at,
    last_seen = EXCLUDED.last_seen;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.handle_user_profile_upsert TO authenticated;
