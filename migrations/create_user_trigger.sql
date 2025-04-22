
-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated function for handling new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    -- Create profile with user_id reference
    INSERT INTO public.profiles (
      id,
      email,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      NOW(),
      NOW()
    );

    -- Create onboarding status
    INSERT INTO public.onboarding_status (
      user_id,
      is_complete,
      created_at
    ) VALUES (
      NEW.id,
      false,
      NOW()
    );

    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error and rollback this transaction
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
