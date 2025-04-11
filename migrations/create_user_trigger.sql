-- Function to handle a new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW());

  -- Create onboarding status
  INSERT INTO public.onboarding_status (user_id, is_complete, created_at)
  VALUES (NEW.id, FALSE, NOW());

  -- Create user record (in a different table, assumed to be public.users)
  INSERT INTO public.users (id, email, created_at, last_active_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
