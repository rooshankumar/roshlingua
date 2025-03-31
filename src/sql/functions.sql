
CREATE OR REPLACE FUNCTION create_new_user(user_id uuid, user_email text)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = user_email) THEN
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (user_id, user_email, NOW(), NOW());
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
